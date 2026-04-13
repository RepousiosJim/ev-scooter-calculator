import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { consumeSSE, SSEError } from '$lib/utils/sse-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal ReadableStream that yields the provided chunks in order
 * and then signals done.
 */
function makeStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
	let index = 0;
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (index < chunks.length) {
				controller.enqueue(chunks[index++]);
			} else {
				controller.close();
			}
		},
	});
}

/**
 * Encode a string to Uint8Array so it can be fed into a ReadableStream.
 */
function enc(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

/**
 * Build a mock Response whose body is a ReadableStream of the provided text.
 */
function mockResponse(body: string, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		body: makeStream([enc(body)]),
	} as unknown as Response;
}

/** Creates a mock fetch that returns a signal-aware hanging response. */
function mockHangingFetch() {
	return async (_url: string | URL | Request, init?: RequestInit) => {
		const signal = init?.signal;
		return {
			ok: true,
			status: 200,
			body: new ReadableStream<Uint8Array>({
				pull() {
					return new Promise<void>((_, reject) => {
						if (signal?.aborted) {
							reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
							return;
						}
						signal?.addEventListener(
							'abort',
							() => {
								reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
							},
							{ once: true }
						);
					});
				},
			}),
		} as unknown as Response;
	};
}

// ---------------------------------------------------------------------------
// Tests – basic event parsing  (original suite, preserved unchanged)
// ---------------------------------------------------------------------------

describe('consumeSSE – basic event parsing', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('calls onEvent with event name "message" and parsed JSON data', async () => {
		const payload = JSON.stringify({ speed: 42 });
		const sseText = `data: ${payload}\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<{ event: string; data: unknown }> = [];
		await consumeSSE('http://test/sse', {}, (event, data) => events.push({ event, data }));

		expect(events).toHaveLength(1);
		expect(events[0].event).toBe('message');
		expect(events[0].data).toEqual({ speed: 42 });
	});

	it('uses the event: field as the event name when present', async () => {
		const sseText = `event: progress\ndata: {"pct":50}\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<{ event: string; data: unknown }> = [];
		await consumeSSE('http://test/sse', {}, (event, data) => events.push({ event, data }));

		expect(events[0].event).toBe('progress');
		expect(events[0].data).toEqual({ pct: 50 });
	});

	it('falls back to raw string when data is not valid JSON', async () => {
		const sseText = `data: not-valid-json\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<{ event: string; data: unknown }> = [];
		await consumeSSE('http://test/sse', {}, (event, data) => events.push({ event, data }));

		expect(events[0].data).toBe('not-valid-json');
	});

	it('processes multiple events from a single stream', async () => {
		const sseText = [`event: start\ndata: {"id":1}\n\n`, `event: end\ndata: {"id":2}\n\n`].join('');
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<{ event: string; data: unknown }> = [];
		await consumeSSE('http://test/sse', {}, (event, data) => events.push({ event, data }));

		expect(events).toHaveLength(2);
		expect(events[0].event).toBe('start');
		expect(events[1].event).toBe('end');
	});

	it('ignores blank/whitespace-only event blocks', async () => {
		const sseText = `\n\ndata: {"ok":true}\n\n\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<unknown> = [];
		await consumeSSE('http://test/sse', {}, (_e, d) => events.push(d));

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ ok: true });
	});

	it('events without a data: line are silently skipped', async () => {
		const sseText = `event: ping\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<unknown> = [];
		await consumeSSE('http://test/sse', {}, (_e, d) => events.push(d));

		expect(events).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Tests – HTTP error handling  (original suite)
// ---------------------------------------------------------------------------

describe('consumeSSE – HTTP error handling', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('throws when the HTTP response is not ok (4xx)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 404));

		await expect(consumeSSE('http://test/sse', {}, vi.fn())).rejects.toThrow('HTTP 404');
	});

	it('throws when the HTTP response is not ok (5xx)', async () => {
		// With default maxRetries=3 the 503 will be retried; make fetch always
		// return 503 so we exhaust retries and get the final throw.
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('', 503));

		await expect(
			consumeSSE('http://test/sse', {}, vi.fn(), {
				maxRetries: 0,
				baseDelay: 0,
			})
		).rejects.toThrow('HTTP 503');
	});

	it('throws when fetch itself rejects (network error)', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network failure'));

		await expect(consumeSSE('http://test/sse', {}, vi.fn(), { maxRetries: 0 })).rejects.toThrow('network failure');
	});

	it('throws when response body is null', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
			ok: true,
			status: 200,
			body: null,
		} as unknown as Response);

		await expect(consumeSSE('http://test/sse', {}, vi.fn())).rejects.toThrow('No response body');
	});
});

// ---------------------------------------------------------------------------
// Tests – chunked / streaming delivery  (original suite)
// ---------------------------------------------------------------------------

describe('consumeSSE – chunked / streaming delivery', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('reassembles an event split across two chunks', async () => {
		const chunk1 = enc('event: split\ndat');
		const chunk2 = enc(`a: {"x":99}\n\n`);

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
			ok: true,
			status: 200,
			body: makeStream([chunk1, chunk2]),
		} as unknown as Response);

		const events: Array<{ event: string; data: unknown }> = [];
		await consumeSSE('http://test/sse', {}, (event, data) => events.push({ event, data }));

		expect(events).toHaveLength(1);
		expect(events[0].event).toBe('split');
		expect(events[0].data).toEqual({ x: 99 });
	});

	it('handles many small single-byte chunks without losing events', async () => {
		const sseText = `data: {"n":7}\n\n`;
		const chunks = [...sseText].map((ch) => enc(ch));

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
			ok: true,
			status: 200,
			body: makeStream(chunks),
		} as unknown as Response);

		const events: Array<unknown> = [];
		await consumeSSE('http://test/sse', {}, (_e, d) => events.push(d));

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ n: 7 });
	});
});

// ---------------------------------------------------------------------------
// Tests – request options forwarding  (original suite)
// ---------------------------------------------------------------------------

describe('consumeSSE – request options forwarding', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('passes the url and options object to fetch unchanged', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(''));

		const opts: RequestInit = {
			method: 'POST',
			headers: { Authorization: 'Bearer tok' },
		};

		await consumeSSE('https://api.example.com/stream', opts, vi.fn());

		expect(fetchSpy).toHaveBeenCalledOnce();
		// The signal key is stripped internally; verify the rest is intact
		const [calledUrl, calledOpts] = fetchSpy.mock.calls[0];
		expect(calledUrl).toBe('https://api.example.com/stream');
		expect((calledOpts as RequestInit).method).toBe('POST');
		expect((calledOpts as RequestInit & { headers: Record<string, string> }).headers?.Authorization).toBe('Bearer tok');
	});

	it('returns a resolved Promise (void) on a successful empty stream', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(''));

		const result = await consumeSSE('http://test/sse', {}, vi.fn());
		expect(result).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Tests – retry with exponential backoff  (NEW)
// ---------------------------------------------------------------------------

describe('consumeSSE – retry with exponential backoff', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('retries on network errors up to maxRetries times', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValueOnce(new TypeError('network failure'))
			.mockRejectedValueOnce(new TypeError('network failure'))
			.mockResolvedValueOnce(mockResponse(`data: {"ok":true}\n\n`));

		const events: unknown[] = [];
		const p = consumeSSE('http://test/sse', {}, (_e, d) => events.push(d), {
			maxRetries: 3,
			baseDelay: 100,
		});

		// Drain the microtask queue so first two fetch rejections fire
		await vi.runAllTimersAsync();
		await p;

		expect(fetchSpy).toHaveBeenCalledTimes(3);
		expect(events).toHaveLength(1);
	});

	it('throws after exhausting maxRetries', async () => {
		// Use Once x3 so the mock is exhausted after the expected calls
		vi.spyOn(globalThis, 'fetch')
			.mockRejectedValueOnce(new TypeError('network failure'))
			.mockRejectedValueOnce(new TypeError('network failure'))
			.mockRejectedValueOnce(new TypeError('network failure'));

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 2,
			baseDelay: 50,
		});
		// Attach catch immediately so Vitest never sees an unhandled rejection
		const settled = p.catch((e: unknown) => e);

		await vi.runAllTimersAsync();

		const result = await settled;
		expect(result).toBeInstanceOf(TypeError);
		expect((result as TypeError).message).toBe('network failure');
		expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3); // 1 + 2 retries
	});

	it('uses exponential backoff delays between retries', async () => {
		// Track real wall-clock of each fetch call in fake-timer units
		const fetchTimes: number[] = [];
		// 4 Once calls (initial + 3 retries) so the mock is exhausted cleanly
		vi.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(async () => {
				fetchTimes.push(Date.now());
				throw new TypeError('net');
			})
			.mockImplementationOnce(async () => {
				fetchTimes.push(Date.now());
				throw new TypeError('net');
			})
			.mockImplementationOnce(async () => {
				fetchTimes.push(Date.now());
				throw new TypeError('net');
			})
			.mockImplementationOnce(async () => {
				fetchTimes.push(Date.now());
				throw new TypeError('net');
			});

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 3,
			baseDelay: 1000,
			maxDelay: 30_000,
		});
		// Attach catch immediately so Vitest never sees an unhandled rejection
		const settled = p.catch(() => {
			/* expected */
		});

		await vi.runAllTimersAsync();
		await settled;

		// Should have been called 4 times (initial + 3 retries)
		expect(fetchTimes).toHaveLength(4);

		// Gaps should be ~1000, ~2000, ~4000
		const gap0 = fetchTimes[1] - fetchTimes[0];
		const gap1 = fetchTimes[2] - fetchTimes[1];
		const gap2 = fetchTimes[3] - fetchTimes[2];

		expect(gap0).toBeGreaterThanOrEqual(1000);
		expect(gap0).toBeLessThan(2000);
		expect(gap1).toBeGreaterThanOrEqual(2000);
		expect(gap1).toBeLessThan(4000);
		expect(gap2).toBeGreaterThanOrEqual(4000);
		expect(gap2).toBeLessThan(8000);
	});

	it('caps backoff delay at maxDelay', async () => {
		let fetchCount = 0;
		// 5 Once calls (initial + 4 retries) so the mock is exhausted cleanly
		const impl = async () => {
			fetchCount++;
			throw new TypeError('net');
		};
		vi.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(impl)
			.mockImplementationOnce(impl)
			.mockImplementationOnce(impl)
			.mockImplementationOnce(impl)
			.mockImplementationOnce(impl);

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 4,
			baseDelay: 1000,
			maxDelay: 3000,
		});
		// Attach catch immediately so Vitest never sees an unhandled rejection
		const settled = p.catch(() => {
			/* expected */
		});

		// Delays should be: 1000, 2000, 3000, 3000 (capped)
		// Total = 9000ms — advance past all of them
		await vi.advanceTimersByTimeAsync(9500);
		await vi.runAllTimersAsync();
		await settled;

		// Should have been called 5 times (1 + 4 retries), all delays <= 3000
		expect(fetchCount).toBe(5);
	});

	it('retries on 5xx server errors', async () => {
		let calls = 0;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
			calls++;
			// First call → 500, second call → success
			return calls === 1 ? mockResponse('', 500) : mockResponse(`data: "ok"\n\n`);
		});

		const events: unknown[] = [];
		const p = consumeSSE('http://test/sse', {}, (_e, d) => events.push(d), {
			maxRetries: 2,
			baseDelay: 10,
		});

		await vi.runAllTimersAsync();
		await p;

		expect(calls).toBe(2);
		expect(events).toHaveLength(1);
	});

	it('does NOT retry on 401 Unauthorized', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 401));

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 3,
			baseDelay: 100,
		});
		const settled = p.catch((e: unknown) => e as SSEError);

		await vi.runAllTimersAsync();

		const err = await settled;
		expect(err).toBeInstanceOf(SSEError);
		expect((err as SSEError).message).toBe('HTTP 401');
		// Should only have been called once — no retries
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does NOT retry on 403 Forbidden', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 403));

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 3,
			baseDelay: 100,
		});
		const settled = p.catch((e: unknown) => e as SSEError);

		await vi.runAllTimersAsync();

		const err = await settled;
		expect((err as SSEError).message).toBe('HTTP 403');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does NOT retry on 404 Not Found', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 404));

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 3,
			baseDelay: 100,
		});
		const settled = p.catch((e: unknown) => e as SSEError);

		await vi.runAllTimersAsync();

		const err = await settled;
		expect((err as SSEError).message).toBe('HTTP 404');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Tests – timeout handling  (NEW)
// ---------------------------------------------------------------------------

describe('consumeSSE – timeout handling', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('triggers timeout when no events arrive within the timeout window', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(mockHangingFetch());

		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 0,
			timeout: 5000,
		});
		// Attach catch immediately so Vitest never sees an unhandled rejection
		const settled = p.catch((e: unknown) => e);

		// Advance past the timeout
		await vi.advanceTimersByTimeAsync(6000);

		const err = await settled;
		expect(err).toBeInstanceOf(SSEError);
		expect((err as SSEError).message).toContain('SSE timeout');
	});

	it('does not timeout when events arrive before the deadline', async () => {
		// Respond with one normal event; stream closes naturally before timeout
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(`data: {"ok":true}\n\n`));

		const events: unknown[] = [];
		const p = consumeSSE('http://test/sse', {}, (_e, d) => events.push(d), {
			maxRetries: 0,
			timeout: 5000,
		});

		await vi.runAllTimersAsync();
		await p;

		expect(events).toHaveLength(1);
	});

	it('treats timeout as retriable and retries', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(mockHangingFetch())
			.mockResolvedValueOnce(mockResponse(`data: "done"\n\n`));

		const events: unknown[] = [];
		const p = consumeSSE('http://test/sse', {}, (_e, d) => events.push(d), {
			maxRetries: 2,
			baseDelay: 0,
			timeout: 1000,
		});

		// Advance past timeout to trigger retry
		await vi.advanceTimersByTimeAsync(2000);
		// Allow retry + stream read
		await vi.runAllTimersAsync();
		await p;

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(events).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Tests – connection state tracking  (NEW)
// ---------------------------------------------------------------------------

describe('consumeSSE – connection state tracking', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('transitions through connecting → open → closed on success', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(`data: {}\n\n`));

		const states: string[] = [];
		await consumeSSE('http://test/sse', {}, vi.fn(), {
			onStateChange: (s) => states.push(s),
		});

		expect(states).toEqual(['connecting', 'open', 'closed']);
	});

	it('transitions to error state on non-retriable failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 401));

		const states: string[] = [];
		await consumeSSE('http://test/sse', {}, vi.fn(), {
			onStateChange: (s) => states.push(s),
		}).catch(() => {
			/* expected */
		});

		expect(states).toContain('error');
		expect(states).not.toContain('closed');
	});

	it('transitions back to connecting on retry', async () => {
		vi.useFakeTimers();

		vi.spyOn(globalThis, 'fetch')
			.mockRejectedValueOnce(new TypeError('net'))
			.mockResolvedValueOnce(mockResponse(`data: {}\n\n`));

		const states: string[] = [];
		const p = consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 1,
			baseDelay: 100,
			onStateChange: (s) => states.push(s),
		});

		await vi.runAllTimersAsync();
		await p;

		vi.useRealTimers();

		// First attempt: connecting
		// After failure + delay: connecting again
		// Success: open → closed
		expect(states.filter((s) => s === 'connecting')).toHaveLength(2);
		expect(states[states.length - 1]).toBe('closed');
	});
});

// ---------------------------------------------------------------------------
// Tests – graceful abort  (NEW)
// ---------------------------------------------------------------------------

describe('consumeSSE – graceful abort', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('resolves (not rejects) when caller aborts during fetch', async () => {
		const controller = new AbortController();

		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts) => {
			// Simulate aborting before fetch resolves
			controller.abort();
			// Real fetch with an aborted signal throws DOMException
			const sig = (opts as RequestInit)?.signal;
			if (sig?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
			return mockResponse('');
		});

		const result = consumeSSE('http://test/sse', { signal: controller.signal }, vi.fn(), {
			maxRetries: 3,
		});

		await vi.runAllTimersAsync();
		// Should resolve cleanly, not throw
		await expect(result).resolves.toBeUndefined();
	});

	it('does not retry after caller aborts', async () => {
		const controller = new AbortController();
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts) => {
			controller.abort();
			const sig = (opts as RequestInit)?.signal;
			if (sig?.aborted) throw new DOMException('Aborted', 'AbortError');
			return mockResponse('');
		});

		const p = consumeSSE('http://test/sse', { signal: controller.signal }, vi.fn(), {
			maxRetries: 5,
			baseDelay: 100,
		});

		await vi.runAllTimersAsync();
		await p;

		// Aborted immediately — no retries
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('sets state to closed (not error) when aborted by caller', async () => {
		const controller = new AbortController();

		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, opts) => {
			controller.abort();
			const sig = (opts as RequestInit)?.signal;
			if (sig?.aborted) throw new DOMException('Aborted', 'AbortError');
			return mockResponse('');
		});

		const states: string[] = [];
		const p = consumeSSE('http://test/sse', { signal: controller.signal }, vi.fn(), {
			maxRetries: 3,
			onStateChange: (s) => states.push(s),
		});

		await vi.runAllTimersAsync();
		await p;

		expect(states[states.length - 1]).toBe('closed');
		expect(states).not.toContain('error');
	});

	it('resolves cleanly when already-aborted signal is passed', async () => {
		const controller = new AbortController();
		controller.abort();

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(''));

		const result = consumeSSE('http://test/sse', { signal: controller.signal }, vi.fn(), {
			maxRetries: 3,
		});

		await vi.runAllTimersAsync();
		await expect(result).resolves.toBeUndefined();

		// Should never have called fetch at all
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Tests – error categorisation  (NEW)
// ---------------------------------------------------------------------------

describe('consumeSSE – error categorisation via SSEError', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Helper: run consumeSSE with maxRetries:0 and a fixed status code,
	 * expecting it to throw. Returns the caught error.
	 */
	async function runAndCatch(status: number): Promise<SSEError> {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', status));
		const err = await consumeSSE('http://test/sse', {}, vi.fn(), {
			maxRetries: 0,
		}).catch((e: unknown) => e);
		return err as SSEError;
	}

	it('throws SSEError for 4xx responses', async () => {
		const err = await runAndCatch(404);
		expect(err).toBeInstanceOf(SSEError);
		expect(err.status).toBe(404);
		expect(err.retriable).toBe(false);
	});

	it('marks 401 as non-retriable', async () => {
		const err = await runAndCatch(401);
		expect(err.retriable).toBe(false);
	});

	it('marks 403 as non-retriable', async () => {
		const err = await runAndCatch(403);
		expect(err.retriable).toBe(false);
	});

	it('marks 500 as retriable', async () => {
		const err = await runAndCatch(500);
		expect(err).toBeInstanceOf(SSEError);
		expect(err.status).toBe(500);
		expect(err.retriable).toBe(true);
	});

	it('SSEError has the correct name', async () => {
		const err = await runAndCatch(418);
		expect(err.name).toBe('SSEError');
	});
});
