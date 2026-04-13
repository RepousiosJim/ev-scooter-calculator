/**
 * Unit tests for candidate-store CRUD operations.
 * fs/promises and fs are mocked so no actual filesystem access occurs.
 *
 * The candidate-store uses a module-level `cache` variable.  To prevent
 * bleed-through between tests each describe block uses vi.resetModules() +
 * dynamic imports so every import gets a fresh module instance with cache=null.
 */
import { describe, it, expect, vi } from 'vitest';
import type { PresetCandidate } from '$lib/server/verification/preset-generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidate(key: string, overrides: Partial<PresetCandidate> = {}): PresetCandidate {
	return {
		key,
		name: key.replace(/_/g, ' '),
		year: 2024,
		config: {
			v: 48,
			ah: 15,
			watts: 350,
			motors: 1,
			wheel: 10,
			weight: 75,
			style: 15,
			charger: 3,
			regen: 0,
			cost: 0.12,
			slope: 0,
			ridePosition: 0.5,
			dragCoefficient: 1.1,
			frontalArea: 0.5,
			rollingResistance: 0.02,
			soh: 1,
			ambientTemp: 20,
		},
		manufacturerSpecs: { topSpeed: 30, range: 40 },
		validation: { valid: true, issues: [], confidence: 80 },
		sources: { discoveredFrom: 'Test', extractedAt: new Date().toISOString() },
		status: 'pending',
		...overrides,
	};
}

/**
 * Create fresh mocks for fs/promises and fs, then dynamically import the
 * candidate-store module so it gets a brand-new cache=null instance.
 */
async function freshImport(initialData: PresetCandidate[] = []) {
	vi.resetModules();

	vi.doMock('fs/promises', () => ({
		readFile: vi.fn().mockResolvedValue(JSON.stringify(initialData)),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
	}));

	vi.doMock('fs', () => ({
		existsSync: vi.fn().mockReturnValue(initialData.length > 0),
	}));

	const store = await import('$lib/server/verification/candidate-store');
	const fsMock = await import('fs/promises');
	const fsSync = await import('fs');

	return { store, fsMock, fsSync };
}

// ---------------------------------------------------------------------------
// addCandidates
// ---------------------------------------------------------------------------

describe('candidate-store – addCandidates', () => {
	it('adds new candidates and returns correct counts', async () => {
		const { store } = await freshImport([]);
		const c1 = makeCandidate('ninebot_max');
		const c2 = makeCandidate('xiaomi_pro2');

		const result = await store.addCandidates([c1, c2]);

		expect(result.added).toBe(2);
		expect(result.skipped).toBe(0);
	});

	it('skips duplicate keys and reports them', async () => {
		const existing = makeCandidate('ninebot_max');
		const { store } = await freshImport([existing]);

		const duplicate = makeCandidate('ninebot_max');
		const fresh = makeCandidate('xiaomi_pro2');

		const result = await store.addCandidates([duplicate, fresh]);

		expect(result.added).toBe(1);
		expect(result.skipped).toBe(1);
	});

	it('returns added=0 and skipped=0 for empty input', async () => {
		const { store } = await freshImport([]);
		const result = await store.addCandidates([]);
		expect(result.added).toBe(0);
		expect(result.skipped).toBe(0);
	});

	it('persists data by calling writeFile', async () => {
		const { store, fsMock } = await freshImport([]);
		await store.addCandidates([makeCandidate('ninebot_max')]);
		expect(fsMock.writeFile).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getCandidates
// ---------------------------------------------------------------------------

describe('candidate-store – getCandidates', () => {
	it('returns all candidates when no status filter is given', async () => {
		const data = [
			makeCandidate('ninebot_max', { status: 'pending' }),
			makeCandidate('xiaomi_pro2', { status: 'approved' }),
			makeCandidate('varla_eagle', { status: 'rejected' }),
		];
		const { store } = await freshImport(data);
		const all = await store.getCandidates();
		expect(all).toHaveLength(3);
	});

	it('filters by pending status', async () => {
		const data = [
			makeCandidate('ninebot_max', { status: 'pending' }),
			makeCandidate('xiaomi_pro2', { status: 'approved' }),
		];
		const { store } = await freshImport(data);
		const result = await store.getCandidates('pending');
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe('ninebot_max');
	});

	it('filters by approved status', async () => {
		const data = [
			makeCandidate('ninebot_max', { status: 'pending' }),
			makeCandidate('xiaomi_pro2', { status: 'approved' }),
		];
		const { store } = await freshImport(data);
		const result = await store.getCandidates('approved');
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe('xiaomi_pro2');
	});

	it('filters by rejected status', async () => {
		const data = [
			makeCandidate('ninebot_max', { status: 'pending' }),
			makeCandidate('varla_eagle', { status: 'rejected' }),
		];
		const { store } = await freshImport(data);
		const result = await store.getCandidates('rejected');
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe('varla_eagle');
	});

	it('returns empty array when no candidates match the filter', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max', { status: 'pending' })]);
		const result = await store.getCandidates('approved');
		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getCandidate
// ---------------------------------------------------------------------------

describe('candidate-store – getCandidate', () => {
	it('finds a candidate by key', async () => {
		const data = [makeCandidate('ninebot_max'), makeCandidate('xiaomi_pro2')];
		const { store } = await freshImport(data);
		const result = await store.getCandidate('ninebot_max');
		expect(result).not.toBeNull();
		expect(result!.key).toBe('ninebot_max');
	});

	it('returns null for an unknown key', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max')]);
		const result = await store.getCandidate('does_not_exist');
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// updateCandidateStatus
// ---------------------------------------------------------------------------

describe('candidate-store – updateCandidateStatus', () => {
	it('updates status to approved', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max', { status: 'pending' })]);
		const result = await store.updateCandidateStatus('ninebot_max', 'approved');
		expect(result).not.toBeNull();
		expect(result!.status).toBe('approved');
	});

	it('updates status to rejected with notes', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max', { status: 'pending' })]);
		const result = await store.updateCandidateStatus('ninebot_max', 'rejected', 'Bad data quality');
		expect(result!.status).toBe('rejected');
		expect(result!.notes).toBe('Bad data quality');
	});

	it('returns null for an unknown key', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max')]);
		const result = await store.updateCandidateStatus('unknown_key', 'approved');
		expect(result).toBeNull();
	});

	it('persists after status update', async () => {
		const { store, fsMock } = await freshImport([makeCandidate('ninebot_max', { status: 'pending' })]);
		await store.updateCandidateStatus('ninebot_max', 'approved');
		expect(fsMock.writeFile).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateCandidateConfig
// ---------------------------------------------------------------------------

describe('candidate-store – updateCandidateConfig', () => {
	it('merges config updates without replacing the entire config', async () => {
		const original = makeCandidate('ninebot_max', {
			config: {
				v: 36,
				ah: 12,
				watts: 300,
				motors: 1,
				wheel: 10,
				weight: 75,
				style: 15,
				charger: 3,
				regen: 0,
				cost: 0.12,
				slope: 0,
				ridePosition: 0.5,
				dragCoefficient: 1.1,
				frontalArea: 0.5,
				rollingResistance: 0.02,
				soh: 1,
				ambientTemp: 20,
			},
		});
		const { store } = await freshImport([original]);

		const result = await store.updateCandidateConfig('ninebot_max', {
			config: { watts: 500 } as any,
		});

		expect(result).not.toBeNull();
		expect(result!.config.watts).toBe(500);
		expect(result!.config.v).toBe(36);
	});

	it('updates name', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max')]);
		const result = await store.updateCandidateConfig('ninebot_max', { name: 'Ninebot Max G2' });
		expect(result!.name).toBe('Ninebot Max G2');
	});

	it('updates year', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max')]);
		const result = await store.updateCandidateConfig('ninebot_max', { year: 2025 });
		expect(result!.year).toBe(2025);
	});

	it('does not allow status to be changed via config update', async () => {
		// updateCandidateConfig only applies: config, name, year, manufacturerSpecs, notes
		// status is NOT in the allowed list, so it should be ignored
		const { store } = await freshImport([makeCandidate('ninebot_max', { status: 'pending' })]);
		const result = await store.updateCandidateConfig('ninebot_max', { status: 'approved' } as any);
		expect(result!.status).toBe('pending');
	});

	it('returns null for an unknown key', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max')]);
		const result = await store.updateCandidateConfig('unknown_key', { name: 'X' });
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// removeCandidate
// ---------------------------------------------------------------------------

describe('candidate-store – removeCandidate', () => {
	it('removes a candidate by key and returns true', async () => {
		const data = [makeCandidate('ninebot_max'), makeCandidate('xiaomi_pro2')];
		const { store } = await freshImport(data);
		const result = await store.removeCandidate('ninebot_max');
		expect(result).toBe(true);
	});

	it('returns false for an unknown key', async () => {
		const { store } = await freshImport([makeCandidate('ninebot_max')]);
		const result = await store.removeCandidate('does_not_exist');
		expect(result).toBe(false);
	});

	it('persists after removal', async () => {
		const data = [makeCandidate('ninebot_max'), makeCandidate('xiaomi_pro2')];
		const { store, fsMock } = await freshImport(data);
		await store.removeCandidate('ninebot_max');
		expect(fsMock.writeFile).toHaveBeenCalled();
	});

	it('leaves other candidates intact after removal', async () => {
		const data = [makeCandidate('ninebot_max'), makeCandidate('xiaomi_pro2')];
		const { store, fsMock } = await freshImport(data);

		await store.removeCandidate('ninebot_max');

		const writtenContent = vi.mocked(fsMock.writeFile).mock.calls[0][1] as string;
		const writtenData = JSON.parse(writtenContent) as PresetCandidate[];
		const keys = writtenData.map((c) => c.key);
		expect(keys).not.toContain('ninebot_max');
		expect(keys).toContain('xiaomi_pro2');
	});
});
