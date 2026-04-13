/**
 * Unit tests for store-local.ts (LocalVerificationStore).
 *
 * All fs/promises and fs calls are mocked so no real filesystem I/O occurs.
 * We use vi.resetModules() + dynamic imports (same pattern as candidate-store.spec.ts)
 * so each describe block gets a fresh module instance with a clean cache.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ScooterVerification } from '$lib/server/verification/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVerification(key: string): ScooterVerification {
	return {
		scooterKey: key,
		fields: {},
		priceHistory: [],
		lastUpdated: new Date().toISOString(),
		overallConfidence: 80,
	};
}

interface FsMock {
	readFile: ReturnType<typeof vi.fn>;
	writeFile: ReturnType<typeof vi.fn>;
	mkdir: ReturnType<typeof vi.fn>;
	stat: ReturnType<typeof vi.fn>;
}
interface FsSyncMock {
	existsSync: ReturnType<typeof vi.fn>;
}

/**
 * Create a fresh LocalVerificationStore with mocked fs.
 * @param initialData - Optional initial JSON content (record of key→verification)
 * @param fileExists - Whether the store file is reported to exist
 * @param corrupt - If true, readFile returns invalid JSON
 */
async function freshStore(
	initialData: Record<string, ScooterVerification> = {},
	fileExists = true,
	corrupt = false
): Promise<{ store: InstanceType<any>; fsMock: FsMock; fsSync: FsSyncMock }> {
	vi.resetModules();

	const mockStat = vi.fn().mockResolvedValue({ mtimeMs: 1000 });

	vi.doMock('fs/promises', () => ({
		readFile: corrupt
			? vi.fn().mockResolvedValue('{ bad json }')
			: vi.fn().mockResolvedValue(JSON.stringify(initialData)),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		stat: mockStat,
	}));

	vi.doMock('fs', () => ({
		existsSync: vi.fn().mockReturnValue(fileExists),
	}));

	const fsMock = (await import('fs/promises')) as unknown as FsMock;
	const fsSync = (await import('fs')) as unknown as FsSyncMock;
	const mod = await import('$lib/server/verification/store-local');
	const store = new mod.LocalVerificationStore();

	return { store, fsMock, fsSync };
}

// ---------------------------------------------------------------------------
// get()
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – get()', () => {
	it('returns verification for a known key', async () => {
		const v = makeVerification('ninebot_max');
		const { store } = await freshStore({ ninebot_max: v });
		const result = await store.get('ninebot_max');
		expect(result).not.toBeNull();
		expect(result!.scooterKey).toBe('ninebot_max');
	});

	it('returns null for an unknown key', async () => {
		const { store } = await freshStore({ ninebot_max: makeVerification('ninebot_max') });
		const result = await store.get('unknown_key');
		expect(result).toBeNull();
	});

	it('returns null when the store is empty', async () => {
		const { store } = await freshStore({});
		expect(await store.get('anything')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// set()
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – set()', () => {
	it('writes to the file after set()', async () => {
		const { store, fsMock } = await freshStore({});
		await store.set('ninebot_max', makeVerification('ninebot_max'));
		expect(fsMock.writeFile).toHaveBeenCalled();
	});

	it('the written JSON contains the key', async () => {
		const { store, fsMock } = await freshStore({});
		await store.set('ninebot_max', makeVerification('ninebot_max'));
		const written = vi.mocked(fsMock.writeFile).mock.calls[0][1] as string;
		const parsed = JSON.parse(written);
		expect(parsed).toHaveProperty('ninebot_max');
	});

	it('adds to existing data without overwriting other keys', async () => {
		const existing = makeVerification('xiaomi_pro2');
		const { store, fsMock } = await freshStore({ xiaomi_pro2: existing });
		await store.set('ninebot_max', makeVerification('ninebot_max'));
		const written = vi.mocked(fsMock.writeFile).mock.calls[0][1] as string;
		const parsed = JSON.parse(written);
		expect(parsed).toHaveProperty('xiaomi_pro2');
		expect(parsed).toHaveProperty('ninebot_max');
	});

	it('overwrites an existing key', async () => {
		const v = makeVerification('ninebot_max');
		const { store, fsMock } = await freshStore({ ninebot_max: v });

		const updated = { ...v, overallConfidence: 99 };
		await store.set('ninebot_max', updated);

		const written = vi.mocked(fsMock.writeFile).mock.calls[0][1] as string;
		const parsed = JSON.parse(written);
		expect(parsed.ninebot_max.overallConfidence).toBe(99);
	});
});

// ---------------------------------------------------------------------------
// getAll()
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – getAll()', () => {
	it('returns all verifications', async () => {
		const data = {
			ninebot_max: makeVerification('ninebot_max'),
			xiaomi_pro2: makeVerification('xiaomi_pro2'),
		};
		const { store } = await freshStore(data);
		const all = await store.getAll();
		expect(Object.keys(all)).toHaveLength(2);
		expect(all).toHaveProperty('ninebot_max');
		expect(all).toHaveProperty('xiaomi_pro2');
	});

	it('returns empty object when store has no entries', async () => {
		const { store } = await freshStore({});
		const all = await store.getAll();
		expect(all).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// File not found
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – file not found', () => {
	it('returns null from get() when file does not exist', async () => {
		const { store } = await freshStore({}, false);
		const result = await store.get('anything');
		expect(result).toBeNull();
	});

	it('returns empty object from getAll() when file does not exist', async () => {
		const { store } = await freshStore({}, false);
		const all = await store.getAll();
		expect(all).toEqual({});
	});

	it('creates the file on set() when it did not previously exist', async () => {
		const { store, fsMock } = await freshStore({}, false);
		await store.set('new_key', makeVerification('new_key'));
		expect(fsMock.writeFile).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Corrupt JSON
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – corrupt JSON', () => {
	it('returns null from get() when JSON is corrupt', async () => {
		const { store } = await freshStore({}, true, true);
		// Should not throw; treats corrupt store as empty
		const result = await store.get('anything');
		expect(result).toBeNull();
	});

	it('returns empty object from getAll() when JSON is corrupt', async () => {
		const { store } = await freshStore({}, true, true);
		const all = await store.getAll();
		expect(all).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// Cache behaviour
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – cache', () => {
	it('reads from cache on second call (readFile called only once)', async () => {
		const data = { ninebot_max: makeVerification('ninebot_max') };
		const { store, fsMock } = await freshStore(data);

		await store.get('ninebot_max');
		await store.get('ninebot_max');

		// readFile should only have been called once (second call uses cache)
		expect(vi.mocked(fsMock.readFile).mock.calls.length).toBe(1);
	});

	it('invalidateCache() forces a reload on next access', async () => {
		const data = { ninebot_max: makeVerification('ninebot_max') };
		const { store, fsMock } = await freshStore(data);

		await store.get('ninebot_max');
		store.invalidateCache();
		await store.get('ninebot_max');

		// readFile called twice: initial load + reload after invalidation
		expect(vi.mocked(fsMock.readFile).mock.calls.length).toBe(2);
	});

	it('reloads when file modification time increases', async () => {
		vi.resetModules();

		let callCount = 0;
		const statMock = vi.fn().mockImplementation(() => {
			callCount++;
			// Return increasing mtimeMs on each call to simulate file change
			return Promise.resolve({ mtimeMs: callCount * 1000 });
		});

		vi.doMock('fs/promises', () => ({
			readFile: vi.fn().mockResolvedValue(JSON.stringify({ ninebot_max: makeVerification('ninebot_max') })),
			writeFile: vi.fn().mockResolvedValue(undefined),
			mkdir: vi.fn().mockResolvedValue(undefined),
			stat: statMock,
		}));

		vi.doMock('fs', () => ({
			existsSync: vi.fn().mockReturnValue(true),
		}));

		const fsMod = await import('fs/promises');
		const mod = await import('$lib/server/verification/store-local');
		const store = new mod.LocalVerificationStore();

		await store.get('ninebot_max');
		await store.get('ninebot_max');

		// Because mtimeMs changed (1000 → 2000), readFile should have been called twice
		expect(vi.mocked(fsMod.readFile).mock.calls.length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Mutex – concurrent set operations
// ---------------------------------------------------------------------------

describe('LocalVerificationStore – mutex serialization', () => {
	it('concurrent set() calls all complete without data loss', async () => {
		const { store, fsMock } = await freshStore({});

		// Fire 5 concurrent set operations
		await Promise.all([
			store.set('scooter_a', makeVerification('scooter_a')),
			store.set('scooter_b', makeVerification('scooter_b')),
			store.set('scooter_c', makeVerification('scooter_c')),
			store.set('scooter_d', makeVerification('scooter_d')),
			store.set('scooter_e', makeVerification('scooter_e')),
		]);

		// writeFile should have been called 5 times (once per set)
		expect(vi.mocked(fsMock.writeFile).mock.calls.length).toBe(5);
	});

	it('getAll() completes correctly while concurrent sets are running', async () => {
		const data = { ninebot_max: makeVerification('ninebot_max') };
		const { store } = await freshStore(data);

		const [all] = await Promise.all([store.getAll(), store.set('xiaomi_pro2', makeVerification('xiaomi_pro2'))]);

		// getAll() result should at minimum contain the initial data
		expect(all).toHaveProperty('ninebot_max');
	});
});
