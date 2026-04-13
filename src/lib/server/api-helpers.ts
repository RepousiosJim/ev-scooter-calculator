import { json } from '@sveltejs/kit';
import { checkRateLimit, type RateLimitResult } from './rate-limit';
import { computeScoreBreakdown } from '$lib/utils/scoring';
import type { ScooterConfig, PerformanceStats } from '$lib/types';

export const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Accept',
} as const;

export const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=3600, s-maxage=86400',
} as const;

export function corsResponse() {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function buildHeaders(rl: RateLimitResult, cache = true) {
	return {
		...CORS_HEADERS,
		...(cache ? CACHE_HEADERS : {}),
		'Content-Type': 'application/json',
		'X-RateLimit-Remaining': String(rl.remaining),
		'X-RateLimit-Limit': '100',
		'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
	};
}

export function rateLimitResponse(rl: RateLimitResult, headers: Record<string, string>) {
	const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
	return json(
		{ error: 'Rate limit exceeded', retryAfter },
		{ status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } }
	);
}

/**
 * Check rate limit and return headers + optional 429 response.
 * Usage: const { headers, limited } = applyRateLimit(ip); if (limited) return limited;
 */
export async function applyRateLimit(ip: string, cache = true) {
	const rl = await checkRateLimit(ip);
	const headers = buildHeaders(rl, cache);
	const limited = rl.allowed ? null : rateLimitResponse(rl, headers);
	return { headers, limited };
}

export function apiScoreBreakdown(config: ScooterConfig, stats: PerformanceStats) {
	const b = computeScoreBreakdown(config, stats);
	return {
		accel: b.accel,
		range: b.range,
		speed: b.speed,
		efficiency: b.efficiency,
		penalties: Math.round(-(b.strainPenalty + b.weightPenalty) * 10) / 10,
	};
}
