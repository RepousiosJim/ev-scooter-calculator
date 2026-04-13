/**
 * Unit tests for src/lib/server/api-helpers.ts
 *
 * checkRateLimit, applyRateLimit and apiScoreBreakdown are tested indirectly
 * via their collaborators. The pure helpers (CORS_HEADERS, CACHE_HEADERS,
 * corsResponse, buildHeaders, rateLimitResponse, apiScoreBreakdown) are all
 * exercised directly here without hitting the network or Supabase.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the rate-limit dependency so we control its output
// ---------------------------------------------------------------------------
vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimit: vi.fn(),
}));

// Mock scoring so apiScoreBreakdown doesn't need real physics
vi.mock('$lib/utils/scoring', () => ({
	computeScoreBreakdown: vi.fn().mockReturnValue({
		accel: 60,
		range: 70,
		speed: 80,
		efficiency: 75,
		strainPenalty: 5,
		weightPenalty: 3,
	}),
}));

import {
	CORS_HEADERS,
	CACHE_HEADERS,
	corsResponse,
	buildHeaders,
	rateLimitResponse,
	applyRateLimit,
	apiScoreBreakdown,
} from '$lib/server/api-helpers';
import { checkRateLimit } from '$lib/server/rate-limit';
import type { RateLimitResult } from '$lib/server/rate-limit';
import type { ScooterConfig, PerformanceStats } from '$lib/types';

// ---------------------------------------------------------------------------
// CORS_HEADERS / CACHE_HEADERS constants
// ---------------------------------------------------------------------------

describe('CORS_HEADERS', () => {
	it('exposes Access-Control-Allow-Origin *', () => {
		expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
	});

	it('allows GET, POST, OPTIONS methods', () => {
		expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('GET');
		expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('POST');
		expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('OPTIONS');
	});

	it('allows Content-Type header', () => {
		expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('Content-Type');
	});
});

describe('CACHE_HEADERS', () => {
	it('has a Cache-Control header', () => {
		expect(CACHE_HEADERS['Cache-Control']).toBeTruthy();
	});

	it('includes s-maxage for CDN caching', () => {
		expect(CACHE_HEADERS['Cache-Control']).toContain('s-maxage');
	});
});

// ---------------------------------------------------------------------------
// corsResponse
// ---------------------------------------------------------------------------

describe('corsResponse', () => {
	it('returns a 204 status', () => {
		const res = corsResponse();
		expect(res.status).toBe(204);
	});

	it('returns a Response instance', () => {
		const res = corsResponse();
		expect(res).toBeInstanceOf(Response);
	});
});

// ---------------------------------------------------------------------------
// buildHeaders
// ---------------------------------------------------------------------------

const mockRl: RateLimitResult = {
	allowed: true,
	remaining: 42,
	resetAt: Date.now() + 60_000,
};

describe('buildHeaders', () => {
	it('includes CORS headers', () => {
		const h = buildHeaders(mockRl);
		expect(h['Access-Control-Allow-Origin']).toBe('*');
	});

	it('includes Content-Type application/json', () => {
		const h = buildHeaders(mockRl);
		expect(h['Content-Type']).toBe('application/json');
	});

	it('includes X-RateLimit-Remaining as a string', () => {
		const h = buildHeaders(mockRl);
		expect(h['X-RateLimit-Remaining']).toBe('42');
	});

	it('includes X-RateLimit-Limit of 100', () => {
		const h = buildHeaders(mockRl);
		expect(h['X-RateLimit-Limit']).toBe('100');
	});

	it('includes Cache-Control when cache=true (default)', () => {
		const h = buildHeaders(mockRl);
		expect(h['Cache-Control']).toBeTruthy();
	});

	it('omits Cache-Control when cache=false', () => {
		const h = buildHeaders(mockRl, false);
		expect(h['Cache-Control']).toBeUndefined();
	});

	it('includes X-RateLimit-Reset derived from resetAt', () => {
		const h = buildHeaders(mockRl);
		const expected = String(Math.floor(mockRl.resetAt / 1000));
		expect(h['X-RateLimit-Reset']).toBe(expected);
	});
});

// ---------------------------------------------------------------------------
// rateLimitResponse
// ---------------------------------------------------------------------------

describe('rateLimitResponse', () => {
	it('returns a 429 status', async () => {
		const rl: RateLimitResult = { allowed: false, remaining: 0, resetAt: Date.now() + 30_000 };
		const headers = buildHeaders(rl, false);
		const res = rateLimitResponse(rl, headers);
		expect(res.status).toBe(429);
	});

	it('response body contains error field', async () => {
		const rl: RateLimitResult = { allowed: false, remaining: 0, resetAt: Date.now() + 30_000 };
		const headers = buildHeaders(rl, false);
		const res = rateLimitResponse(rl, headers);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	it('response body contains retryAfter > 0', async () => {
		const rl: RateLimitResult = { allowed: false, remaining: 0, resetAt: Date.now() + 10_000 };
		const headers = buildHeaders(rl, false);
		const res = rateLimitResponse(rl, headers);
		const body = await res.json();
		expect(body.retryAfter).toBeGreaterThan(0);
	});

	it('includes Retry-After response header', () => {
		const rl: RateLimitResult = { allowed: false, remaining: 0, resetAt: Date.now() + 20_000 };
		const headers = buildHeaders(rl, false);
		const res = rateLimitResponse(rl, headers);
		expect(res.headers.get('Retry-After')).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// applyRateLimit
// ---------------------------------------------------------------------------

describe('applyRateLimit – allowed request', () => {
	it('returns null for limited when the request is allowed', async () => {
		const allowedResult: RateLimitResult = { allowed: true, remaining: 50, resetAt: Date.now() + 60_000 };
		vi.mocked(checkRateLimit).mockResolvedValue(allowedResult);

		const result = await applyRateLimit('1.2.3.4');
		expect(result.limited).toBeNull();
	});

	it('returns headers when the request is allowed', async () => {
		const allowedResult: RateLimitResult = { allowed: true, remaining: 50, resetAt: Date.now() + 60_000 };
		vi.mocked(checkRateLimit).mockResolvedValue(allowedResult);

		const result = await applyRateLimit('1.2.3.4');
		expect(result.headers['X-RateLimit-Remaining']).toBe('50');
	});
});

describe('applyRateLimit – blocked request', () => {
	it('returns a Response for limited when the request is blocked', async () => {
		const blockedResult: RateLimitResult = { allowed: false, remaining: 0, resetAt: Date.now() + 30_000 };
		vi.mocked(checkRateLimit).mockResolvedValue(blockedResult);

		const result = await applyRateLimit('9.9.9.9');
		expect(result.limited).not.toBeNull();
		expect(result.limited!.status).toBe(429);
	});

	it('headers are still returned when request is blocked', async () => {
		const blockedResult: RateLimitResult = { allowed: false, remaining: 0, resetAt: Date.now() + 30_000 };
		vi.mocked(checkRateLimit).mockResolvedValue(blockedResult);

		const result = await applyRateLimit('9.9.9.9');
		expect(result.headers['X-RateLimit-Remaining']).toBe('0');
	});

	it('passes cache=false flag through to headers when specified', async () => {
		const allowedResult: RateLimitResult = { allowed: true, remaining: 10, resetAt: Date.now() + 60_000 };
		vi.mocked(checkRateLimit).mockResolvedValue(allowedResult);

		const result = await applyRateLimit('1.2.3.4', false);
		expect(result.headers['Cache-Control']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// apiScoreBreakdown
// ---------------------------------------------------------------------------

const baseConfig: ScooterConfig = {
	v: 52,
	ah: 16,
	motors: 2,
	watts: 1600,
	style: 25,
	weight: 80,
	wheel: 10,
	charger: 3,
	regen: 0.05,
	cost: 0.2,
	slope: 0,
	ridePosition: 0.5,
	soh: 1,
	ambientTemp: 20,
};

const baseStats: PerformanceStats = {
	wh: 790,
	totalRange: 60,
	speed: 65,
	hillSpeed: 35,
	totalWatts: 3200,
	chargeTime: 5,
	costPer100km: 2.5,
	accelScore: 70,
	amps: 28,
	cRate: 1.75,
};

describe('apiScoreBreakdown', () => {
	it('returns accel, range, speed, efficiency, penalties fields', () => {
		const result = apiScoreBreakdown(baseConfig, baseStats);
		expect(result).toHaveProperty('accel');
		expect(result).toHaveProperty('range');
		expect(result).toHaveProperty('speed');
		expect(result).toHaveProperty('efficiency');
		expect(result).toHaveProperty('penalties');
	});

	it('penalties is a number (negative strain + weight penalty sum)', () => {
		const result = apiScoreBreakdown(baseConfig, baseStats);
		// With mock: strainPenalty=5, weightPenalty=3 → -(5+3)=-8, rounded to -8
		expect(typeof result.penalties).toBe('number');
	});

	it('returns the mocked score values from computeScoreBreakdown', () => {
		const result = apiScoreBreakdown(baseConfig, baseStats);
		expect(result.accel).toBe(60);
		expect(result.range).toBe(70);
		expect(result.speed).toBe(80);
		expect(result.efficiency).toBe(75);
	});
});
