/**
 * Lightweight SSE client using fetch + ReadableStream.
 * Parses Server-Sent Events and calls the handler for each event.
 *
 * Supports:
 *  - Exponential backoff retry for network / 5xx errors
 *  - Per-connection timeout (no-event watchdog)
 *  - Connection state tracking via onStateChange callback
 *  - Graceful abort via AbortController
 *  - Error categorisation (fatal vs. retriable)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

/** Categorised error thrown by consumeSSE on non-retriable failures. */
export class SSEError extends Error {
	constructor(
		message: string,
		/** HTTP status that caused the error, if applicable. */
		public readonly status?: number,
		/** Whether the error is a transient network / server problem. */
		public readonly retriable: boolean = false
	) {
		super(message);
		this.name = 'SSEError';
	}
}

export interface SSEOptions {
	/**
	 * Extra fetch options forwarded verbatim.
	 * An AbortController signal already present here is respected but
	 * consumeSSE also creates its own internal signal; both are combined.
	 */
	fetchOptions?: RequestInit;

	/**
	 * Maximum number of automatic retries on retriable failures.
	 * @default 3
	 */
	maxRetries?: number;

	/**
	 * Base delay (ms) between retries. Doubles each attempt, capped at
	 * `maxDelay`. Actual value is `baseDelay * 2^attempt`.
	 * @default 1000
	 */
	baseDelay?: number;

	/**
	 * Upper bound for the computed backoff delay (ms).
	 * @default 30000
	 */
	maxDelay?: number;

	/**
	 * Milliseconds of silence after which the connection is considered stale
	 * and treated as a retriable failure.  0 or undefined = no timeout.
	 */
	timeout?: number;

	/** Called whenever the connection state changes. */
	onStateChange?: (state: ConnectionState) => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Classify an HTTP status code.
 * Returns { ok: true } for 2xx, { ok: false, retriable } otherwise.
 */
function classifyStatus(status: number): { ok: boolean; retriable: boolean } {
	if (status >= 200 && status < 300) return { ok: true, retriable: false };
	// 401 / 403 – auth problems, retrying won't help
	if (status === 401 || status === 403) return { ok: false, retriable: false };
	// 5xx – transient server errors
	if (status >= 500) return { ok: false, retriable: true };
	// Other 4xx – client error, don't retry
	return { ok: false, retriable: false };
}

/**
 * Incremental Server-Sent Events parser following the WHATWG spec:
 * - lines end in CRLF, LF or CR (a CR at the end of one chunk may be followed by
 *   the LF of the next, so a trailing CR is held back);
 * - a leading BOM is stripped; lines starting with ':' are comments;
 * - "field: value" splits at the first colon and drops one leading space; a
 *   line without a colon is a field with an empty value;
 * - multiple data lines are joined with "\n"; a blank line dispatches the event
 *   (only if it has data); an incomplete event at end of stream is discarded.
 * JSON data is parsed when possible; otherwise the raw string is passed.
 */
class SSEParser {
	private buffer = '';
	private sawFirstChunk = false;
	private eventName = '';
	private dataLines: string[] = [];

	constructor(private onEvent: (event: string, data: unknown) => void) {}

	push(chunk: string): void {
		if (!this.sawFirstChunk) {
			this.sawFirstChunk = true;
			if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
		}
		this.buffer += chunk;

		let start = 0;
		for (let i = 0; i < this.buffer.length; i++) {
			const ch = this.buffer[i];
			if (ch !== '\n' && ch !== '\r') continue;
			// A CR at the very end might be the first half of a CRLF split across chunks.
			if (ch === '\r' && i === this.buffer.length - 1) break;
			this.line(this.buffer.slice(start, i));
			if (ch === '\r' && this.buffer[i + 1] === '\n') i++;
			start = i + 1;
		}
		this.buffer = this.buffer.slice(start);
	}

	private line(line: string): void {
		if (line === '') return this.dispatch();
		if (line.startsWith(':')) return;
		const colon = line.indexOf(':');
		const field = colon === -1 ? line : line.slice(0, colon);
		let value = colon === -1 ? '' : line.slice(colon + 1);
		if (value.startsWith(' ')) value = value.slice(1);
		if (field === 'event') this.eventName = value;
		else if (field === 'data') this.dataLines.push(value);
		// `id` and `retry` are not used by this client; unknown fields are ignored.
	}

	private dispatch(): void {
		const name = this.eventName || 'message';
		const data = this.dataLines.join('\n');
		const hasData = this.dataLines.length > 0;
		this.eventName = '';
		this.dataLines = [];
		if (!hasData) return;
		let parsed: unknown = data;
		try {
			parsed = JSON.parse(data);
		} catch {
			/* not JSON — pass the raw string */
		}
		this.onEvent(name, parsed);
	}
}

/** Sleep for `ms` milliseconds, respecting an external abort signal. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const id = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(id);
				reject(new DOMException('Aborted', 'AbortError'));
			},
			{ once: true }
		);
	});
}

// ---------------------------------------------------------------------------
// Core single-attempt reader
// ---------------------------------------------------------------------------

/**
 * Returns a Promise that rejects with a DOMException('AbortError') when
 * `signal` fires, and resolves if `signal` never fires before cleanup.
 * Used to race against reader.read() so that abort/timeout unblocks the loop.
 */
function abortPromise(signal: AbortSignal): Promise<never> {
	return new Promise<never>((_resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
	});
}

/**
 * Perform a single fetch + read cycle.
 * Throws SSEError on HTTP errors, DOMException('AbortError') on abort,
 * or a plain Error on network failure.
 */
async function attempt(
	url: string,
	fetchOptions: RequestInit,
	onEvent: (event: string, data: unknown) => void,
	onFirstByte: () => void,
	timeout: number | undefined,
	externalSignal: AbortSignal
): Promise<void> {
	// One combined controller for this attempt.
	// - external abort: forward from caller
	// - timeout abort: armed after each data chunk
	const controller = new AbortController();
	const mergedSignal = controller.signal;

	// Propagate external abort into our controller. Removed in `finally` so
	// retries don't pile listeners onto the caller's signal.
	const forwardAbort = () => controller.abort();
	if (externalSignal.aborted) {
		controller.abort();
	} else {
		externalSignal.addEventListener('abort', forwardAbort, { once: true });
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let timeoutError: SSEError | undefined;

	function armTimeout() {
		if (!timeout) return;
		clearTimeout(timeoutId);
		timeoutError = new SSEError('SSE timeout: no data received', undefined, true);
		timeoutId = setTimeout(() => {
			controller.abort();
		}, timeout);
	}

	function clearTimeoutTimer() {
		clearTimeout(timeoutId);
		timeoutId = undefined;
	}

	// abortPromise races against reader.read() so that timeouts and
	// external aborts can unblock a hanging stream reader.
	const abortRace = abortPromise(mergedSignal);

	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

	try {
		armTimeout();

		const response = await Promise.race([fetch(url, { ...fetchOptions, signal: mergedSignal }), abortRace]);

		const { ok, retriable } = classifyStatus(response.status);
		if (!ok) {
			clearTimeoutTimer();
			throw new SSEError(`HTTP ${response.status}`, response.status, retriable);
		}

		reader = response.body?.getReader();
		if (!reader) {
			clearTimeoutTimer();
			throw new SSEError('No response body', undefined, false);
		}

		onFirstByte();
		armTimeout(); // reset watchdog on connection open

		const decoder = new TextDecoder();
		const parser = new SSEParser(onEvent);

		while (true) {
			const { done, value } = await Promise.race([reader.read(), abortRace]);

			if (done) {
				parser.push(decoder.decode());
				break;
			}

			// Reset watchdog each time data arrives
			armTimeout();

			parser.push(decoder.decode(value, { stream: true }));
		}
	} catch (err) {
		// Cancel the reader to release the lock (best-effort)
		reader?.cancel().catch(() => {
			/* ignore */
		});

		clearTimeoutTimer();

		// If this was an abort triggered internally (timeout or our own
		// controller), and the external caller did NOT abort, re-throw the
		// timeout error.
		if (
			err instanceof DOMException &&
			err.name === 'AbortError' &&
			mergedSignal.aborted &&
			!externalSignal.aborted &&
			timeoutError
		) {
			throw timeoutError;
		}

		throw err;
	} finally {
		externalSignal.removeEventListener('abort', forwardAbort);
		try {
			reader?.releaseLock();
		} catch {
			// lock may have been released by cancel() already
		}
		clearTimeoutTimer();
	}
}

// ---------------------------------------------------------------------------
// Public API — backwards-compatible overload
// ---------------------------------------------------------------------------

/**
 * Consume a Server-Sent Events stream.
 *
 * ### Basic usage (original API — unchanged)
 * ```ts
 * await consumeSSE(url, fetchOptions, onEvent);
 * ```
 *
 * ### Extended usage (new options)
 * ```ts
 * const abort = new AbortController();
 * await consumeSSE(url, fetchOptions, onEvent, {
 *   maxRetries: 5,
 *   timeout: 10_000,
 *   onStateChange: (state) => console.log('SSE state:', state),
 *   fetchOptions: { signal: abort.signal },
 * });
 * ```
 */
export async function consumeSSE(
	url: string,
	options: RequestInit,
	onEvent: (event: string, data: unknown) => void,
	sseOptions?: SSEOptions
): Promise<void> {
	const method = (options.method ?? sseOptions?.fetchOptions?.method ?? 'GET').toUpperCase();
	const {
		fetchOptions,
		// Retrying a POST would re-run its side effects (e.g. start a batch job
		// again), so only idempotent requests retry unless the caller opts in.
		maxRetries = method === 'GET' || method === 'HEAD' ? 3 : 0,
		baseDelay = 1000,
		maxDelay = 30_000,
		timeout,
		onStateChange,
	} = sseOptions ?? {};

	// Merge fetchOptions from sseOptions with the positional options arg.
	// The positional arg is the primary source; sseOptions.fetchOptions is
	// secondary (kept for forward-compat).
	const mergedFetchOptions: RequestInit = { ...fetchOptions, ...options };

	// Extract a caller-supplied abort signal from the merged fetch options.
	const callerSignal: AbortSignal | undefined =
		mergedFetchOptions.signal instanceof AbortSignal ? (mergedFetchOptions.signal as AbortSignal) : undefined;

	// We need a stable external abort signal that is not the one we pass to
	// fetch (which we rebuild each attempt). Strip it from the fetch options
	// so that attempt() manages its own signal internally.
	const fetchOptsWithoutSignal = { ...mergedFetchOptions };
	delete fetchOptsWithoutSignal.signal;

	// Fallback signal that is never aborted, so we can safely call .aborted
	const neverAborted: AbortSignal = new AbortController().signal;
	const externalSignal: AbortSignal = callerSignal ?? neverAborted;

	const setState = (s: ConnectionState) => onStateChange?.(s);

	setState('connecting');

	let attempt_num = 0;

	while (true) {
		if (externalSignal.aborted) {
			setState('closed');
			return;
		}

		try {
			await attempt(url, fetchOptsWithoutSignal, onEvent, () => setState('open'), timeout, externalSignal);

			setState('closed');
			return;
		} catch (err) {
			// Caller-initiated abort — stop silently
			if (externalSignal.aborted) {
				setState('closed');
				return;
			}

			const isRetriable = err instanceof SSEError ? err.retriable : err instanceof TypeError; // network errors from fetch

			const attemptsLeft = maxRetries - attempt_num;

			if (!isRetriable || attemptsLeft <= 0) {
				setState('error');
				throw err;
			}

			// Exponential backoff
			const delay = Math.min(baseDelay * Math.pow(2, attempt_num), maxDelay);
			attempt_num++;

			try {
				await sleep(delay, externalSignal);
			} catch {
				// Aborted during sleep
				setState('closed');
				return;
			}

			setState('connecting');
		}
	}
}
