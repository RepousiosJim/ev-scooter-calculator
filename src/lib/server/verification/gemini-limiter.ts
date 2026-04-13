/**
 * Shared Gemini rate-limiter used by both discovery.ts and llm-extract.ts.
 *
 * Free tier: 15 RPM → minimum 4 seconds between requests.
 * All callers go through throttleGemini() which serialises requests via a
 * promise chain, guaranteeing that at most one Gemini request is sent every
 * MIN_INTERVAL_MS regardless of how many concurrent discovery batches are
 * running.
 */

/** Minimum gap between consecutive Gemini sends (free tier: 15 RPM) */
const MIN_INTERVAL_MS = 4_000;

let lastCallTime = 0;
let rateLimitedUntil = 0;

// Single promise chain — all callers append to this queue so requests are
// sent serially with correct spacing even when callers run in parallel.
let queue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

/**
 * Await this before every Gemini fetch.
 * Blocks until (a) any active rate-limit backoff expires and
 * (b) the minimum inter-request interval has passed.
 */
export async function throttleGemini(): Promise<void> {
	// Append to the chain — each appended task runs after the previous one
	// resolves, so no two callers can proceed simultaneously.
	queue = queue.then(async () => {
		// Wait out any active rate-limit backoff
		const backoffRemaining = rateLimitedUntil - Date.now();
		if (backoffRemaining > 0) {
			await sleep(backoffRemaining);
		}

		// Enforce minimum spacing since last request
		const elapsed = Date.now() - lastCallTime;
		if (elapsed < MIN_INTERVAL_MS) {
			await sleep(MIN_INTERVAL_MS - elapsed);
		}

		lastCallTime = Date.now();
	});

	await queue;
}

/**
 * Call immediately after receiving a 429 response.
 * Reads the Retry-After header if present; otherwise backs off 60 seconds.
 */
export function markRateLimited(retryAfterHeader?: string | null): void {
	const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
	const backoffMs = retryAfterSec > 0 ? retryAfterSec * 1_000 : 60_000;
	rateLimitedUntil = Date.now() + backoffMs;
}

/**
 * Returns true if an API key is present and no active rate-limit backoff.
 * Use for cheap pre-flight checks before building prompts.
 */
export function isGeminiAvailable(apiKey: string | undefined): boolean {
	return !!apiKey && Date.now() >= rateLimitedUntil;
}

/** Exposed for tests / admin status endpoint. */
export function getRateLimitState(): { rateLimitedUntil: number; lastCallTime: number } {
	return { rateLimitedUntil, lastCallTime };
}
