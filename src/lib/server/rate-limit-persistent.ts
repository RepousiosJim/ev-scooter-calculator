/**
 * Persistent rate limiter backed by Supabase.
 * Uses a single atomic DB call (check_rate_limit_atomic) instead of the previous
 * two-query SELECT + UPDATE pattern, halving round-trips per rate-limited request.
 */
import { db } from './db';
import type { RateLimitResult } from './rate-limit';

const WINDOW_MS = 60_000;

export async function checkRateLimitPersistent(ip: string, max: number): Promise<RateLimitResult> {
	const now = Date.now();
	const key = `${ip}:${max}`;

	const { data, error } = await db().rpc('check_rate_limit_atomic', {
		p_key: key,
		p_max: max,
		p_now: now,
		p_window_ms: WINDOW_MS,
	});

	// Fail open on DB error — don't block requests if the rate-limit table is unavailable
	if (error || !data?.[0]) {
		return { allowed: true, remaining: max - 1, resetAt: now + WINDOW_MS };
	}

	const row = data[0];
	return { allowed: row.allowed, remaining: row.remaining, resetAt: row.reset_at };
}

/** Remove expired windows. Call periodically (e.g. from a cron or edge function). */
export async function cleanupRateLimits(): Promise<void> {
	const cutoff = Date.now() - WINDOW_MS;
	await db().from('rate_limits').delete().lt('window_start', cutoff);
}
