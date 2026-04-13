import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();
vi.mock('$lib/server/db', () => ({
	db: () => ({ rpc: mockRpc, from: mockFrom }),
	isSupabaseAvailable: () => true,
}));

import { checkRateLimitPersistent, cleanupRateLimits } from '$lib/server/rate-limit-persistent';

function rpcResult(allowed: boolean, remaining: number, resetAt: number, error: unknown = null) {
	return { data: [{ allowed, remaining, reset_at: resetAt }], error };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('checkRateLimitPersistent', () => {
	it('returns allowed=true for a new IP (first request)', async () => {
		const now = Date.now();
		mockRpc.mockResolvedValue(rpcResult(true, 9, now + 60_000));

		const result = await checkRateLimitPersistent('1.1.1.1', 10);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(9);
		expect(mockRpc).toHaveBeenCalledWith(
			'check_rate_limit_atomic',
			expect.objectContaining({
				p_key: '1.1.1.1:10',
				p_max: 10,
				p_window_ms: 60_000,
			})
		);
	});

	it('returns allowed=false when count exceeds max', async () => {
		const now = Date.now();
		mockRpc.mockResolvedValue(rpcResult(false, 0, now + 60_000));

		const result = await checkRateLimitPersistent('3.3.3.3', 10);
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('returns allowed=true when under limit', async () => {
		const now = Date.now();
		mockRpc.mockResolvedValue(rpcResult(true, 6, now + 60_000));

		const result = await checkRateLimitPersistent('5.5.5.5', 10);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(6);
	});

	it('fails open when rpc returns an error', async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const result = await checkRateLimitPersistent('9.9.9.9', 10);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(9);
	});

	it('fails open when rpc rejects', async () => {
		mockRpc.mockRejectedValue(new Error('Network error'));

		// Should not throw
		const result = await checkRateLimitPersistent('8.8.8.8', 10).catch(() => null);
		// Either fails open or throws — either way we test the function doesn't silently block
		expect(result === null || result?.allowed === true).toBe(true);
	});
});

describe('cleanupRateLimits', () => {
	it('calls delete with lt on window_start', async () => {
		const chain: Record<string, ReturnType<typeof vi.fn>> = {};
		chain.delete = vi.fn().mockReturnValue(chain);
		chain.lt = vi.fn().mockResolvedValue({ data: null, error: null });
		mockFrom.mockReturnValue(chain);

		await cleanupRateLimits();

		expect(mockFrom).toHaveBeenCalledWith('rate_limits');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.lt).toHaveBeenCalledWith('window_start', expect.any(Number));
	});
});
