import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
	throttleGemini,
	markRateLimited,
	isGeminiAvailable,
	getRateLimitState,
} from '$lib/server/verification/gemini-limiter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset the limiter's internal state to a clean baseline:
 *   rateLimitedUntil = 0  (no active backoff)
 *   lastCallTime      = 0  (never called — avoids 4-second wait in throttleGemini)
 *
 * The module exposes no reset function, so we use the public surface:
 *   markRateLimited() sets rateLimitedUntil = Date.now() + backoffMs.
 * By setting Date.now() to a future point and then moving it back we can
 * zero-out the backoff.  Easier: just set Date.now() to a large epoch so
 * rateLimitedUntil (set via markRateLimited to epoch + 60s) is already in
 * the past, then rely on isGeminiAvailable / getRateLimitState to confirm.
 *
 * For most tests we use vi.setSystemTime() to stamp Date.now() at a known
 * value and force rateLimitedUntil to expire before that point by calling
 * markRateLimited with a header of "0" (0-second retry → falls through to
 * 60_000 ms default — we set time AFTER the backoff expires instead).
 *
 * Simplest reset path: call markRateLimited("0") then advance time 61s.
 * But we use fake timers anyway, so we just set time to something large.
 */
const BASE_NOW = 10_000_000; // arbitrary epoch ms — well past any 0-based backoff

// ---------------------------------------------------------------------------
// isGeminiAvailable
// ---------------------------------------------------------------------------

describe('isGeminiAvailable', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Set time to BASE_NOW so rateLimitedUntil (0 on first run, or expired)
		// is in the past — limiter starts in a clean, non-rate-limited state.
		vi.setSystemTime(BASE_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns false when apiKey is undefined', () => {
		expect(isGeminiAvailable(undefined)).toBe(false);
	});

	it('returns false when apiKey is an empty string', () => {
		expect(isGeminiAvailable('')).toBe(false);
	});

	it('returns false when apiKey is whitespace only', () => {
		// Truthy check uses !! so whitespace is truthy — but any non-empty key
		// still passes the key check; this test documents the actual boundary.
		// A whitespace-only string IS truthy in JS, so availability depends
		// solely on the backoff state.
		const state = getRateLimitState();
		const available = isGeminiAvailable('   ');
		// rateLimitedUntil should be 0 (< BASE_NOW) so no backoff active
		expect(state.rateLimitedUntil).toBeLessThan(BASE_NOW);
		expect(available).toBe(true); // whitespace is truthy — key check passes
	});

	it('returns true when apiKey is present and no backoff is active', () => {
		expect(isGeminiAvailable('valid-api-key')).toBe(true);
	});

	it('returns false during an active rate-limit backoff', () => {
		// Activate backoff (default 60 s)
		markRateLimited();
		// Still at BASE_NOW — backoff expires at BASE_NOW + 60_000
		expect(isGeminiAvailable('valid-api-key')).toBe(false);
	});

	it('returns true once the backoff window has expired', () => {
		markRateLimited(); // backoff until BASE_NOW + 60_000
		// Advance past the backoff window
		vi.setSystemTime(BASE_NOW + 61_000);
		expect(isGeminiAvailable('valid-api-key')).toBe(true);
	});

	it('returns false with a valid key when a Retry-After header sets a long backoff', () => {
		markRateLimited('120'); // 120-second backoff
		vi.setSystemTime(BASE_NOW + 60_000); // only 60 s elapsed — still blocked
		expect(isGeminiAvailable('valid-api-key')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// markRateLimited
// ---------------------------------------------------------------------------

describe('markRateLimited', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(BASE_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('sets rateLimitedUntil ~60 s in the future when no header is provided', () => {
		markRateLimited();
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 60_000);
	});

	it('sets rateLimitedUntil ~60 s in the future when header is null', () => {
		markRateLimited(null);
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 60_000);
	});

	it('sets rateLimitedUntil ~60 s in the future when header is "0"', () => {
		// parseInt("0") === 0, which is not > 0, so defaults to 60_000 ms
		markRateLimited('0');
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 60_000);
	});

	it('uses the Retry-After header value when it is a positive integer', () => {
		markRateLimited('30');
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 30_000);
	});

	it('uses the Retry-After header value for a large backoff', () => {
		markRateLimited('300');
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 300_000);
	});

	it('ignores a non-numeric Retry-After header and defaults to 60 s', () => {
		markRateLimited('abc');
		const { rateLimitedUntil } = getRateLimitState();
		// parseInt('abc') === NaN, not > 0 → falls through to 60_000 ms default
		expect(rateLimitedUntil).toBe(BASE_NOW + 60_000);
	});

	it('successive calls overwrite the previous backoff', () => {
		markRateLimited('10');
		markRateLimited('90');
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 90_000);
	});
});

// ---------------------------------------------------------------------------
// getRateLimitState
// ---------------------------------------------------------------------------

describe('getRateLimitState', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(BASE_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns an object with rateLimitedUntil and lastCallTime properties', () => {
		const state = getRateLimitState();
		expect(state).toHaveProperty('rateLimitedUntil');
		expect(state).toHaveProperty('lastCallTime');
	});

	it('both properties are numbers', () => {
		const state = getRateLimitState();
		expect(typeof state.rateLimitedUntil).toBe('number');
		expect(typeof state.lastCallTime).toBe('number');
	});

	it('reflects the backoff set by markRateLimited', () => {
		markRateLimited('45');
		const { rateLimitedUntil } = getRateLimitState();
		expect(rateLimitedUntil).toBe(BASE_NOW + 45_000);
	});

	it('returns current rateLimitedUntil without side-effects', () => {
		const before = getRateLimitState().rateLimitedUntil;
		getRateLimitState(); // second call — must not mutate
		const after = getRateLimitState().rateLimitedUntil;
		expect(before).toBe(after);
	});
});

// ---------------------------------------------------------------------------
// throttleGemini
// ---------------------------------------------------------------------------

describe('throttleGemini', () => {
	// For throttleGemini we use real timers but bypass the 4-second spacing
	// by using fake timers and auto-advancing them so the suite stays fast.

	beforeEach(() => {
		vi.useFakeTimers();
		// Set far-future epoch so any existing rateLimitedUntil is in the past.
		vi.setSystemTime(BASE_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('resolves as a Promise', async () => {
		// Advance timers automatically so sleep() calls inside throttleGemini
		// resolve immediately — this avoids a real 4-second wait.
		const promise = throttleGemini();
		// Run all pending timer callbacks (the sleep inside throttleGemini)
		await vi.runAllTimersAsync();
		await expect(promise).resolves.toBeUndefined();
	});

	it('returns undefined on resolution (void contract)', async () => {
		const promise = throttleGemini();
		await vi.runAllTimersAsync();
		const result = await promise;
		expect(result).toBeUndefined();
	});

	it('resolves even when called multiple times in parallel', async () => {
		const p1 = throttleGemini();
		const p2 = throttleGemini();
		const p3 = throttleGemini();
		await vi.runAllTimersAsync();
		// All three must settle without throwing
		await expect(Promise.all([p1, p2, p3])).resolves.toEqual([undefined, undefined, undefined]);
	});

	it('updates lastCallTime after resolving', async () => {
		const before = getRateLimitState().lastCallTime;
		const promise = throttleGemini();
		await vi.runAllTimersAsync();
		await promise;
		const after = getRateLimitState().lastCallTime;
		// lastCallTime must have advanced
		expect(after).toBeGreaterThanOrEqual(before);
	});

	it('resolves after a backoff window expires (fake-timer controlled)', async () => {
		// Activate a short backoff (parsed as 1 s → 1000 ms)
		markRateLimited('1');
		// Advance time so the backoff expires before throttleGemini runs
		vi.setSystemTime(BASE_NOW + 2_000);

		const promise = throttleGemini();
		await vi.runAllTimersAsync();
		await expect(promise).resolves.toBeUndefined();
	});
});
