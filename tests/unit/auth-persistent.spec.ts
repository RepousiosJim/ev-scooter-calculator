import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockFrom = vi.fn();
vi.mock('$lib/server/db', () => ({
	db: () => ({ from: mockFrom }),
	isSupabaseAvailable: () => true,
}));

import { revokeNoncePersistent, isNonceRevokedPersistent, cleanupRevokedNonces } from '$lib/server/auth-persistent';

function mockChain(finalData: unknown, finalError: unknown = null) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	chain.upsert = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
	chain.select = vi.fn().mockReturnValue(chain);
	chain.eq = vi.fn().mockReturnValue(chain);
	chain.lt = vi.fn().mockReturnValue(chain);
	chain.delete = vi.fn().mockReturnValue(chain);
	chain.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
	return chain;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('revokeNoncePersistent', () => {
	it('upserts the nonce with its expiry', async () => {
		const chain = mockChain(null);
		mockFrom.mockReturnValue(chain);

		await revokeNoncePersistent('abc123', Date.now() + 60_000);

		expect(mockFrom).toHaveBeenCalledWith('revoked_nonces');
		expect(chain.upsert).toHaveBeenCalledWith({ nonce: 'abc123', expiry: expect.any(Number) }, { onConflict: 'nonce' });
	});
});

describe('isNonceRevokedPersistent', () => {
	it('returns true when nonce exists and has not expired', async () => {
		const futureExpiry = Date.now() + 60_000;
		const chain = mockChain({ expiry: futureExpiry });
		mockFrom.mockReturnValue(chain);

		const result = await isNonceRevokedPersistent('abc123');
		expect(result).toBe(true);
	});

	it('returns false and cleans up when nonce is expired', async () => {
		const pastExpiry = Date.now() - 1000;
		const chain = mockChain({ expiry: pastExpiry });
		mockFrom.mockReturnValue(chain);

		const result = await isNonceRevokedPersistent('expired-nonce');
		expect(result).toBe(false);
		expect(chain.delete).toHaveBeenCalled();
	});

	it('returns false when nonce does not exist', async () => {
		const chain = mockChain(null);
		mockFrom.mockReturnValue(chain);

		const result = await isNonceRevokedPersistent('unknown');
		expect(result).toBe(false);
	});
});

describe('cleanupRevokedNonces', () => {
	it('deletes expired nonces', async () => {
		const chain = mockChain(null);
		mockFrom.mockReturnValue(chain);

		await cleanupRevokedNonces();

		expect(mockFrom).toHaveBeenCalledWith('revoked_nonces');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.lt).toHaveBeenCalledWith('expiry', expect.any(Number));
	});
});
