/**
 * Persistent rate limiter backed by Supabase.
 * Same sliding-window algorithm as the in-memory version,
 * but state survives server restarts and works across instances.
 */
import { db } from './db';
import type { RateLimitResult } from './rate-limit';

const WINDOW_MS = 60_000;

export async function checkRateLimitPersistent(ip: string, max: number): Promise<RateLimitResult> {
	const now = Date.now();
	const key = `${ip}:${max}`;
	const windowCutoff = now - WINDOW_MS;

	// Read current state
	const { data: existing } = await db().from('rate_limits').select('count, window_start').eq('key', key).single();

	// No existing record or window expired — start fresh
	if (!existing || existing.window_start < windowCutoff) {
		await db().from('rate_limits').upsert({ key, count: 1, window_start: now }, { onConflict: 'key' });
		return { allowed: true, remaining: max - 1, resetAt: now + WINDOW_MS };
	}

	// Window is still active — increment
	const newCount = existing.count + 1;
	await db().from('rate_limits').update({ count: newCount }).eq('key', key);

	const remaining = Math.max(0, max - newCount);
	const resetAt = existing.window_start + WINDOW_MS;
	return { allowed: newCount <= max, remaining, resetAt };
}

/** Remove expired windows. Call periodically (e.g. from a cron or edge function). */
export async function cleanupRateLimits(): Promise<void> {
	const cutoff = Date.now() - WINDOW_MS;
	await db().from('rate_limits').delete().lt('window_start', cutoff);
}
