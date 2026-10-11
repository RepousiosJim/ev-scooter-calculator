import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';
import { isBlockedAddress } from './ip-blocklist';

/**
 * SSRF-safe HTTP fetch for URLs that come from admins, scraped pages or search
 * results.
 *
 * - Only http/https on default ports, no credentials in the URL.
 * - IP-literal hosts are checked directly (they never reach DNS lookup).
 * - Hostnames are resolved inside the connection's `lookup`, every resolved
 *   address is checked, and the socket connects to the checked address. Checking
 *   and connecting in one step closes the DNS-rebinding window that a separate
 *   "resolve, check, then fetch" sequence leaves open. TLS SNI and certificate
 *   checks still use the original hostname.
 * - Redirects are followed manually and every hop is re-validated.
 * - One overall timeout, and the body is read as a stream with a byte cap
 *   (Content-Length is not trusted).
 *
 * Uses undici's own `fetch` with its `Agent`: a dispatcher from a different
 * undici major than Node's bundled one is not guaranteed to be compatible.
 */

export interface SafeFetchOptions {
	timeoutMs?: number;
	maxBytes?: number;
	maxRedirects?: number;
	headers?: Record<string, string>;
	/** Accepted content-type prefixes; empty array accepts anything. */
	accept?: string[];
}

export interface SafeFetchResult {
	ok: boolean;
	status: number;
	finalUrl: string;
	contentType: string;
	body: string;
}

export class SafeFetchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SafeFetchError';
	}
}

const DEFAULTS = {
	timeoutMs: 10_000,
	maxBytes: 5 * 1024 * 1024,
	maxRedirects: 5,
	accept: ['text/html', 'application/xhtml+xml'],
};

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata.google']);

/** Overridable policy — only tests should change the defaults. */
export interface SafeFetchPolicy {
	isBlocked: (address: string) => boolean;
	/** Allow non-default ports (tests run local servers on random ports). */
	allowAnyPort: boolean;
	lookup: typeof dnsLookup;
}

const DEFAULT_POLICY: SafeFetchPolicy = { isBlocked: isBlockedAddress, allowAnyPort: false, lookup: dnsLookup };

type LookupCallback = (
	err: NodeJS.ErrnoException | null,
	address: string | { address: string; family: number }[],
	family?: number
) => void;

/** Synchronous URL checks that don't need DNS. Throws SafeFetchError. */
export function assertFetchableUrl(input: string | URL, policy: SafeFetchPolicy = DEFAULT_POLICY): URL {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new SafeFetchError('Invalid URL');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new SafeFetchError(`Blocked protocol: ${url.protocol}`);
	}
	if (url.username || url.password) {
		throw new SafeFetchError('Blocked: credentials in URL');
	}
	// URL normalises the default port to ''; anything else is non-standard.
	if (url.port !== '' && !policy.allowAnyPort) {
		throw new SafeFetchError(`Blocked port: ${url.port}`);
	}
	const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (
		BLOCKED_HOSTNAMES.has(host) ||
		host.endsWith('.localhost') ||
		host.endsWith('.internal') ||
		host.endsWith('.local')
	) {
		throw new SafeFetchError('Blocked hostname');
	}
	// WHATWG URL already normalises numeric forms (0x7f.1, 2130706433, 127.1) to
	// dotted IPv4, so an IP-literal check here catches them all.
	if (isIP(host) && policy.isBlocked(host)) {
		throw new SafeFetchError('Blocked: private/internal IP address');
	}
	return url;
}

export function createSafeFetch(overrides: Partial<SafeFetchPolicy> = {}) {
	const policy: SafeFetchPolicy = { ...DEFAULT_POLICY, ...overrides };
	const { isBlocked } = policy;

	function safeLookup(hostname: string, options: { all?: boolean }, callback: LookupCallback) {
		policy.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
			if (err) return callback(err, []);
			if (addresses.length === 0) {
				return callback(Object.assign(new Error(`No addresses for ${hostname}`), { code: 'ENOTFOUND' }), []);
			}
			const blocked = addresses.find((a) => isBlocked(a.address));
			if (blocked) {
				return callback(
					Object.assign(new SafeFetchError(`Blocked: ${hostname} resolves to a private/internal address`), {
						code: 'EBLOCKED',
					}),
					[]
				);
			}
			if (options?.all) return callback(null, addresses);
			callback(null, addresses[0].address, addresses[0].family);
		});
	}

	const dispatcher: Dispatcher = new Agent({
		connect: { lookup: safeLookup as never },
	});

	return async function safeFetch(input: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
		const { timeoutMs, maxBytes, maxRedirects, accept } = { ...DEFAULTS, ...opts };
		const signal = AbortSignal.timeout(timeoutMs);
		let url = assertFetchableUrl(input, policy);

		for (let hop = 0; ; hop++) {
			let response;
			try {
				response = await undiciFetch(url, {
					headers: opts.headers,
					redirect: 'manual',
					signal,
					dispatcher,
				});
			} catch (e) {
				// undici wraps connect errors; surface our block reason if that's the cause.
				const cause = (e as { cause?: unknown }).cause;
				if (cause instanceof SafeFetchError) throw cause;
				throw e;
			}

			if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
				await response.body?.cancel().catch(() => {});
				if (hop >= maxRedirects) throw new SafeFetchError(`Too many redirects (>${maxRedirects})`);
				url = assertFetchableUrl(new URL(response.headers.get('location')!, url), policy);
				continue;
			}

			const contentType = response.headers.get('content-type') ?? '';
			if (!response.ok) {
				await response.body?.cancel().catch(() => {});
				return { ok: false, status: response.status, finalUrl: url.href, contentType, body: '' };
			}
			if (accept.length > 0 && contentType && !accept.some((t) => contentType.toLowerCase().startsWith(t))) {
				await response.body?.cancel().catch(() => {});
				throw new SafeFetchError(`Unexpected content-type: ${contentType}`);
			}

			const body = await readBodyWithLimit(response.body, maxBytes);
			return { ok: true, status: response.status, finalUrl: url.href, contentType, body };
		}
	};
}

async function readBodyWithLimit(stream: NodeReadableStream<Uint8Array> | null, maxBytes: number): Promise<string> {
	if (!stream) return '';
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let body = '';
	let bytesRead = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytesRead += value.byteLength;
			if (bytesRead > maxBytes) throw new SafeFetchError(`Response body exceeds limit of ${maxBytes} bytes`);
			body += decoder.decode(value, { stream: true });
		}
		body += decoder.decode();
	} finally {
		reader.cancel().catch(() => {});
	}
	return body;
}

/** SSRF-safe fetch for untrusted URLs. See module docs. */
export const safeFetch = createSafeFetch();
