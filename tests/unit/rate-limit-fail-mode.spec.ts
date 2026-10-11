import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Behaviour of checkRateLimit when the persistent (Supabase) limiter fails:
 * it must never fail open.
 */
const mockPersistent = vi.fn();
vi.mock('$lib/server/db', () => ({ isSupabaseAvailable: () => true }));
vi.mock('$lib/server/rate-limit-persistent', () => ({
	checkRateLimitPersistent: (...args: unknown[]) => mockPersistent(...args),
}));
vi.mock('$lib/server/logger', () => ({ logger: { warn: vi.fn() } }));

import { checkRateLimit } from '$lib/server/rate-limit';

beforeEach(() => {
	mockPersistent.mockReset();
});

describe('checkRateLimit with persistent backend', () => {
	it('uses the persistent result when available', async () => {
		mockPersistent.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 1 });
		const result = await checkRateLimit('10.0.0.1', 5);
		expect(result.allowed).toBe(false);
		expect(mockPersistent).toHaveBeenCalledWith('10.0.0.1:5', 5);
	});

	it('namespaces the key by scope', async () => {
		mockPersistent.mockResolvedValue({ allowed: true, remaining: 4, resetAt: 1 });
		await checkRateLimit('10.0.0.2', 5, { scope: 'login' });
		expect(mockPersistent).toHaveBeenCalledWith('login:10.0.0.2:5', 5);
	});

	it("falls back to the in-memory limiter by default (failMode 'memory')", async () => {
		mockPersistent.mockRejectedValue(new Error('db down'));
		const ip = '10.0.0.3';
		for (let i = 0; i < 3; i++) {
			expect((await checkRateLimit(ip, 3)).allowed).toBe(true);
		}
		const blocked = await checkRateLimit(ip, 3);
		expect(blocked.allowed).toBe(false);
		expect(blocked.unavailable).toBeUndefined();
	});

	it("refuses the request when failMode is 'closed'", async () => {
		mockPersistent.mockRejectedValue(new Error('db down'));
		const result = await checkRateLimit('10.0.0.4', 10, { failMode: 'closed' });
		expect(result.allowed).toBe(false);
		expect(result.unavailable).toBe(true);
	});
});
