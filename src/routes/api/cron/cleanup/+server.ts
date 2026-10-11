import { createHash, timingSafeEqual } from 'crypto';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { isSupabaseAvailable } from '$lib/server/db';
import { cleanupRateLimits } from '$lib/server/rate-limit-persistent';
import { logger } from '$lib/server/logger';

export const config = { maxDuration: 60 };

/** Constant-time string comparison (hashing first equalises lengths). */
function secretsMatch(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/**
 * Cron endpoint: runs daily at 03:00 UTC via Vercel Crons (configured in vercel.json).
 * Vercel passes the CRON_SECRET as a Bearer token — validate it to prevent
 * unauthenticated calls.
 */
export const GET: RequestHandler = async ({ request }) => {
	// Vercel Cron authentication: Vercel sends CRON_SECRET as a Bearer token.
	// The secret is required on Vercel (set CRON_SECRET in the project's env vars)
	// and in production; local dev may run without one.
	const authHeader = request.headers.get('authorization') ?? '';
	const cronSecret = env.CRON_SECRET;
	const authorized = cronSecret
		? secretsMatch(authHeader, `Bearer ${cronSecret}`)
		: !process.env.VERCEL && process.env.NODE_ENV !== 'production';

	if (!authorized) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const results: Record<string, unknown> = {};

	// Clean up expired rate-limit windows (only when Supabase is available)
	if (isSupabaseAvailable()) {
		try {
			await cleanupRateLimits();
			results.rateLimits = 'cleaned';
		} catch (e) {
			logger.error({ err: e }, '[cron/cleanup] rate-limit cleanup failed');
			results.rateLimits = 'error';
		}
	} else {
		results.rateLimits = 'skipped (no Supabase)';
	}

	logger.info(results, '[cron/cleanup] completed');

	return new Response(JSON.stringify({ ok: true, results }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
