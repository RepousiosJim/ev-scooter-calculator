/**
 * Rate limiter with Supabase persistence when available,
 * falling back to in-memory for local dev / no-DB setups.
 */
import { isSupabaseAvailable } from './db';
import { checkRateLimitPersistent } from './rate-limit-persistent';

const WINDOW_MS = 60_000; // 1 minute

export const RATE_LIMIT_PUBLIC = 100; // req/min for public API
export const RATE_LIMIT_ADMIN = 60; // req/min for admin API

interface BucketEntry {
	count: number;
	windowStart: number;
	max: number;
}

const buckets = new Map<string, BucketEntry>();

/** Remove entries whose window has expired. */
function cleanup(): void {
	const now = Date.now();
	for (const [ip, entry] of buckets) {
		if (now - entry.windowStart >= WINDOW_MS) {
			buckets.delete(ip);
		}
	}
}

// Periodic cleanup every 2 minutes to prevent unbounded memory growth.
// Using globalThis so the interval is not re-registered on each import in dev HMR.
if (typeof globalThis !== 'undefined' && !(globalThis as Record<string, unknown>).__rateLimitCleanupStarted) {
	(globalThis as Record<string, unknown>).__rateLimitCleanupStarted = true;
	setInterval(cleanup, 120_000);
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number; // Unix timestamp (ms)
}

/**
 * Check whether `ip` is within the rate limit.
 * Pass a `max` to use a custom limit (default: RATE_LIMIT_PUBLIC).
 * Returns a Promise when Supabase is available, or a sync result for in-memory.
 */
export function checkRateLimit(ip: string, max = RATE_LIMIT_PUBLIC): RateLimitResult | Promise<RateLimitResult> {
	if (isSupabaseAvailable()) {
		return checkRateLimitPersistent(ip, max).catch(() => checkRateLimitInMemory(ip, max));
	}
	return checkRateLimitInMemory(ip, max);
}

function checkRateLimitInMemory(ip: string, max: number): RateLimitResult {
	const now = Date.now();

	if (buckets.size > 10000) {
		// Emergency cleanup — evict oldest entries
		const entries = [...buckets.entries()];
		entries.sort((a, b) => a[1].windowStart - b[1].windowStart);
		for (let i = 0; i < entries.length - 5000; i++) {
			buckets.delete(entries[i][0]);
		}
	}

	// Use ip+max as key so public and admin limits track independently per IP
	const key = `${ip}:${max}`;
	const entry = buckets.get(key);

	if (!entry || now - entry.windowStart >= WINDOW_MS) {
		buckets.set(key, { count: 1, windowStart: now, max });
		return { allowed: true, remaining: max - 1, resetAt: now + WINDOW_MS };
	}

	entry.count += 1;
	const remaining = Math.max(0, max - entry.count);
	const resetAt = entry.windowStart + WINDOW_MS;

	return {
		allowed: entry.count <= max,
		remaining,
		resetAt,
	};
}
