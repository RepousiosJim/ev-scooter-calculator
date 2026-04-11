/**
 * Lightweight SSE client using fetch + ReadableStream.
 * Parses Server-Sent Events and calls the handler for each event.
 */
export async function consumeSSE(
	url: string,
	options: RequestInit,
	onEvent: (event: string, data: unknown) => void
): Promise<void> {
	const response = await fetch(url, options);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error('No response body');

	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });

		// Parse SSE events from buffer
		const parts = buffer.split('\n\n');
		buffer = parts.pop() || ''; // Keep incomplete event in buffer

		for (const part of parts) {
			if (!part.trim()) continue;

			let eventName = 'message';
			let eventData = '';

			for (const line of part.split('\n')) {
				if (line.startsWith('event: ')) {
					eventName = line.slice(7).trim();
				} else if (line.startsWith('data: ')) {
					eventData = line.slice(6);
				}
			}

			if (eventData) {
				try {
					onEvent(eventName, JSON.parse(eventData));
				} catch {
					onEvent(eventName, eventData);
				}
			}
		}
	}
}
