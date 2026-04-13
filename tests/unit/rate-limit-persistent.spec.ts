import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockFrom = vi.fn();
vi.mock('$lib/server/db', () => ({
	db: () => ({ from: mockFrom }),
	isSupabaseAvailable: () => true,
}));

import { checkRateLimitPersistent, cleanupRateLimits } from '$lib/server/rate-limit-persistent';

function mockChain(finalData: unknown, finalError: unknown = null) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	chain.select = vi.fn().mockReturnValue(chain);
	chain.upsert = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
	chain.update = vi.fn().mockReturnValue(chain);
	chain.eq = vi.fn().mockReturnValue(chain);
	chain.lt = vi.fn().mockReturnValue(chain);
	chain.delete = vi.fn().mockReturnValue(chain);
	chain.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
	return chain;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('checkRateLimitPersistent', () => {
	it('returns allowed=true for a new IP (no existing record)', async () => {
		// First from() — select returns null (no existing record)
		const selectChain = mockChain(null);
		// Second from() — upsert to create new record
		const upsertChain = mockChain(null);

		mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(upsertChain);

		const result = await checkRateLimitPersistent('1.1.1.1', 10);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(9);
		expect(mockFrom).toHaveBeenCalledWith('rate_limits');
	});

	it('resets expired windows and returns allowed=true', async () => {
		const expiredStart = Date.now() - 120_000; // 2 minutes ago
		// First from() — select returns expired record
		const selectChain = mockChain({ count: 5, window_start: expiredStart });
		// Second from() — upsert resets the window
		const upsertChain = mockChain(null);

		mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(upsertChain);

		const result = await checkRateLimitPersistent('2.2.2.2', 10);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(9);
	});

	it('returns allowed=false when count exceeds max', async () => {
		const now = Date.now();
		// First from() — select returns record at the limit
		const selectChain = mockChain({ count: 10, window_start: now });
		// Second from() — update increments count
		const updateChain = mockChain(null);

		mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

		const result = await checkRateLimitPersistent('3.3.3.3', 10);
		// count becomes 11 after increment, which exceeds 10
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('increments count and returns allowed=true when under limit', async () => {
		const now = Date.now();
		// First from() — select returns record under limit
		const selectChain = mockChain({ count: 3, window_start: now });
		// Second from() — update increments
		const updateChain = mockChain(null);

		mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

		const result = await checkRateLimitPersistent('5.5.5.5', 10);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(6); // 10 - 4 = 6
	});
});

describe('cleanupRateLimits', () => {
	it('calls delete with lt on window_start', async () => {
		const chain = mockChain(null);
		mockFrom.mockReturnValue(chain);

		await cleanupRateLimits();

		expect(mockFrom).toHaveBeenCalledWith('rate_limits');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.lt).toHaveBeenCalledWith('window_start', expect.any(Number));
	});
});
