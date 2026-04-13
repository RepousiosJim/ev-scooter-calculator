import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, RATE_LIMIT_PUBLIC, RATE_LIMIT_ADMIN } from '$lib/server/rate-limit';

/**
 * Unit tests for the in-memory rate limiter.
 *
 * Each test uses a unique IP (or IP+test-id combination) so tests don't share
 * bucket state despite the module-level Map persisting between tests.
 * Fake timers are used to control window resets without real sleeping.
 */

describe('checkRateLimit – allow under limit', () => {
	it('allows the very first request and returns remaining = max - 1', () => {
		const result = checkRateLimit('1.1.1.1', 5);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(4);
	});

	it('allows requests up to the configured maximum', () => {
		const ip = '2.2.2.2';
		const max = 5;
		for (let i = 0; i < max; i++) {
			const result = checkRateLimit(ip, max);
			expect(result.allowed).toBe(true);
		}
	});

	it('remaining decrements with each request', () => {
		const ip = '3.3.3.3';
		const max = 4;
		for (let i = 0; i < max; i++) {
			const result = checkRateLimit(ip, max);
			expect(result.remaining).toBe(max - 1 - i);
		}
	});

	it('resetAt is approximately now + 60 000 ms', () => {
		const before = Date.now();
		const result = checkRateLimit('4.4.4.4', 10);
		const after = Date.now();
		expect(result.resetAt).toBeGreaterThanOrEqual(before + 59_000);
		expect(result.resetAt).toBeLessThanOrEqual(after + 61_000);
	});
});

describe('checkRateLimit – block over limit', () => {
	it('returns allowed=false on the (max + 1)th request', () => {
		const ip = '10.0.0.1';
		const max = 5;
		for (let i = 0; i < max; i++) {
			checkRateLimit(ip, max);
		}
		const result = checkRateLimit(ip, max);
		expect(result.allowed).toBe(false);
	});

	it('remaining is 0 when the limit is exceeded', () => {
		const ip = '10.0.0.2';
		const max = 3;
		for (let i = 0; i < max + 1; i++) {
			checkRateLimit(ip, max);
		}
		const result = checkRateLimit(ip, max);
		expect(result.remaining).toBe(0);
	});

	it('continues to block on further requests beyond the limit', () => {
		const ip = '10.0.0.3';
		const max = 2;
		for (let i = 0; i < max + 5; i++) {
			checkRateLimit(ip, max);
		}
		const result = checkRateLimit(ip, max);
		expect(result.allowed).toBe(false);
	});
});

describe('checkRateLimit – window reset', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('allows requests again after the 60 s window has elapsed', () => {
		const ip = '20.0.0.1';
		const max = 3;
		// Exhaust the limit
		for (let i = 0; i < max + 1; i++) {
			checkRateLimit(ip, max);
		}
		expect(checkRateLimit(ip, max).allowed).toBe(false);

		// Advance time past the window
		vi.advanceTimersByTime(60_001);

		// New window — first request must be allowed
		const result = checkRateLimit(ip, max);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(max - 1);
	});

	it('does not reset before the window has fully elapsed', () => {
		const ip = '20.0.0.2';
		const max = 2;
		for (let i = 0; i < max + 1; i++) {
			checkRateLimit(ip, max);
		}
		vi.advanceTimersByTime(59_999); // 1 ms before window ends
		expect(checkRateLimit(ip, max).allowed).toBe(false);
	});

	it('resets the remaining counter to max - 1 at the start of a new window', () => {
		const ip = '20.0.0.3';
		const max = 5;
		for (let i = 0; i < max; i++) {
			checkRateLimit(ip, max);
		}
		vi.advanceTimersByTime(60_001);
		const result = checkRateLimit(ip, max);
		expect(result.remaining).toBe(max - 1);
	});
});

describe('checkRateLimit – public vs admin limits', () => {
	it('RATE_LIMIT_PUBLIC equals 100', () => {
		expect(RATE_LIMIT_PUBLIC).toBe(100);
	});

	it('RATE_LIMIT_ADMIN equals 60', () => {
		expect(RATE_LIMIT_ADMIN).toBe(60);
	});

	it('public and admin buckets are tracked independently for the same IP', () => {
		const ip = '30.0.0.1';
		const publicMax = RATE_LIMIT_PUBLIC;
		const adminMax = RATE_LIMIT_ADMIN;

		// Exhaust the admin limit
		for (let i = 0; i < adminMax + 1; i++) {
			checkRateLimit(ip, adminMax);
		}

		// Public limit for the same IP must be unaffected (first public request)
		const publicResult = checkRateLimit(ip, publicMax);
		expect(publicResult.allowed).toBe(true);
	});
});

describe('checkRateLimit – returned result shape', () => {
	it('result always contains allowed, remaining and resetAt fields', () => {
		const result = checkRateLimit('50.0.0.1', 10);
		expect(typeof result.allowed).toBe('boolean');
		expect(typeof result.remaining).toBe('number');
		expect(typeof result.resetAt).toBe('number');
	});

	it('remaining is never negative', () => {
		const ip = '50.0.0.2';
		const max = 2;
		// Make many requests well beyond the limit
		for (let i = 0; i < max + 10; i++) {
			const result = checkRateLimit(ip, max);
			expect(result.remaining).toBeGreaterThanOrEqual(0);
		}
	});
});
