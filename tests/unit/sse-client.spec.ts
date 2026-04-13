import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consumeSSE } from '$lib/utils/sse-client';

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

// ---------------------------------------------------------------------------
// Tests
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
		// Two blank separators with no actual content between them
		const sseText = `\n\ndata: {"ok":true}\n\n\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<unknown> = [];
		await consumeSSE('http://test/sse', {}, (_e, d) => events.push(d));

		// Only the one real event should be emitted
		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ ok: true });
	});

	it('events without a data: line are silently skipped', async () => {
		// An event block with only an event name but no data field
		const sseText = `event: ping\n\n`;
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(sseText));

		const events: Array<unknown> = [];
		await consumeSSE('http://test/sse', {}, (_e, d) => events.push(d));

		expect(events).toHaveLength(0);
	});
});

describe('consumeSSE – HTTP error handling', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('throws when the HTTP response is not ok (4xx)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 404));

		await expect(consumeSSE('http://test/sse', {}, vi.fn())).rejects.toThrow('HTTP 404');
	});

	it('throws when the HTTP response is not ok (5xx)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse('', 503));

		await expect(consumeSSE('http://test/sse', {}, vi.fn())).rejects.toThrow('HTTP 503');
	});

	it('throws when fetch itself rejects (network error)', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('network failure'));

		await expect(consumeSSE('http://test/sse', {}, vi.fn())).rejects.toThrow('network failure');
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

describe('consumeSSE – chunked / streaming delivery', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('reassembles an event split across two chunks', async () => {
		// The event is deliberately split in the middle so the buffer logic is exercised
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
		// Split every character into its own chunk
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
		expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/stream', opts);
	});

	it('returns a resolved Promise (void) on a successful empty stream', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(''));

		const result = await consumeSSE('http://test/sse', {}, vi.fn());
		expect(result).toBeUndefined();
	});
});
