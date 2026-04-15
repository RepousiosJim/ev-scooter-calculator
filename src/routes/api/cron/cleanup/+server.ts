import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { isSupabaseAvailable } from '$lib/server/db';
import { cleanupRateLimits } from '$lib/server/rate-limit-persistent';
import { logger } from '$lib/server/logger';

/**
 * Cron endpoint: runs every hour via Vercel Crons (configured in vercel.json).
 * Vercel passes the CRON_SECRET as a Bearer token — validate it to prevent
 * unauthenticated calls.
 */
export const GET: RequestHandler = async ({ request }) => {
	// Vercel Cron authentication: CRON_SECRET env var is auto-set by Vercel
	// when crons are configured. In local dev this header is absent, which is fine.
	const authHeader = request.headers.get('authorization');
	const cronSecret = env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
