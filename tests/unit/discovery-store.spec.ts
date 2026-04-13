/**
 * Unit tests for discovery-store.ts.
 *
 * Uses the resetModules + doMock pattern so each describe block gets a
 * fresh module with cache=null, preventing state bleed-through.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DiscoveryEntry } from '$lib/server/verification/discovery-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<DiscoveryEntry> = {}): DiscoveryEntry {
	return {
		id: `entry-${Math.random().toString(36).slice(2, 8)}`,
		name: 'Test Scooter X1',
		url: 'https://example.com/x1',
		manufacturer: 'Test Brand',
		manufacturerId: 'test_brand',
		specs: { topSpeed: 45, range: 40, batteryWh: 600 },
		isKnown: false,
		discoveryRunId: 'run-001',
		discoveredAt: new Date().toISOString(),
		disposition: null,
		...overrides,
	};
}

interface FreshImportResult {
	store: typeof import('$lib/server/verification/discovery-store');
	fsMock: { readFile: ReturnType<typeof vi.fn>; writeFile: ReturnType<typeof vi.fn>; mkdir: ReturnType<typeof vi.fn> };
	fsSync: { existsSync: ReturnType<typeof vi.fn> };
}

async function freshImport(
	initialData?: object
): FreshImportResult['store'] extends Promise<any> ? never : Promise<FreshImportResult> {
	vi.resetModules();

	const fsMock = {
		readFile: vi
			.fn()
			.mockResolvedValue(
				initialData !== undefined
					? JSON.stringify(initialData)
					: JSON.stringify({ runs: [], entries: [], urlHealth: {} })
			),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
	};

	const fsSync = {
		existsSync: vi.fn().mockReturnValue(initialData !== undefined),
	};

	vi.doMock('fs/promises', () => fsMock);
	vi.doMock('fs', () => fsSync);

	const store = await import('$lib/server/verification/discovery-store');
	return { store, fsMock, fsSync };
}

// ---------------------------------------------------------------------------
// createRun
// ---------------------------------------------------------------------------

describe('discovery-store – createRun', () => {
	it('creates a run with status running', async () => {
		const { store } = await freshImport();
		const run = await store.createRun(['brand_a', 'brand_b']);

		expect(run.status).toBe('running');
		expect(run.manufacturerIds).toEqual(['brand_a', 'brand_b']);
	});

	it('run has a non-empty id', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		expect(run.id).toBeTruthy();
		expect(typeof run.id).toBe('string');
	});

	it('run has a startedAt ISO timestamp', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		expect(() => new Date(run.startedAt)).not.toThrow();
		expect(new Date(run.startedAt).getTime()).toBeGreaterThan(0);
	});

	it('initialises counters to zero', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		expect(run.totalFound).toBe(0);
		expect(run.totalNew).toBe(0);
		expect(run.totalKnown).toBe(0);
		expect(run.candidatesCreated).toBe(0);
		expect(run.errors).toHaveLength(0);
	});

	it('persists by calling writeFile', async () => {
		const { store, fsMock } = await freshImport();
		await store.createRun([]);
		expect(fsMock.writeFile).toHaveBeenCalled();
	});

	it('creates unique ids for successive runs', async () => {
		const { store } = await freshImport();
		const r1 = await store.createRun([]);
		const r2 = await store.createRun([]);
		expect(r1.id).not.toBe(r2.id);
	});
});

// ---------------------------------------------------------------------------
// completeRun
// ---------------------------------------------------------------------------

describe('discovery-store – completeRun', () => {
	it('marks the run as completed', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);

		await store.completeRun(run.id, {
			totalFound: 10,
			totalNew: 5,
			totalKnown: 5,
			candidatesCreated: 3,
			errors: [],
		});

		const runs = await store.getRecentRuns();
		const updated = runs.find((r) => r.id === run.id)!;
		expect(updated.status).toBe('completed');
		expect(updated.totalFound).toBe(10);
		expect(updated.totalNew).toBe(5);
		expect(updated.totalKnown).toBe(5);
		expect(updated.candidatesCreated).toBe(3);
	});

	it('sets completedAt', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.completeRun(run.id, {
			totalFound: 0,
			totalNew: 0,
			totalKnown: 0,
			candidatesCreated: 0,
			errors: [],
		});

		const runs = await store.getRecentRuns();
		const updated = runs.find((r) => r.id === run.id)!;
		expect(updated.completedAt).toBeDefined();
	});

	it('does nothing when runId does not exist', async () => {
		const { store, fsMock: _fsMock } = await freshImport();
		// No error should be thrown
		await expect(
			store.completeRun('non-existent-id', {
				totalFound: 0,
				totalNew: 0,
				totalKnown: 0,
				candidatesCreated: 0,
				errors: [],
			})
		).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// failRun
// ---------------------------------------------------------------------------

describe('discovery-store – failRun', () => {
	it('marks the run as failed', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.failRun(run.id, 'Timeout error');

		const runs = await store.getRecentRuns();
		const updated = runs.find((r) => r.id === run.id)!;
		expect(updated.status).toBe('failed');
	});

	it('appends the error message to errors array', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.failRun(run.id, 'Network failure');

		const runs = await store.getRecentRuns();
		const updated = runs.find((r) => r.id === run.id)!;
		expect(updated.errors).toContain('Network failure');
	});

	it('does nothing when runId does not exist', async () => {
		const { store } = await freshImport();
		await expect(store.failRun('unknown-run', 'error')).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getRecentRuns
// ---------------------------------------------------------------------------

describe('discovery-store – getRecentRuns', () => {
	it('returns runs sorted newest first (unshift order)', async () => {
		const { store } = await freshImport();
		const _r1 = await store.createRun(['a']);
		const _r2 = await store.createRun(['b']);
		const r3 = await store.createRun(['c']);

		const recent = await store.getRecentRuns();
		// Most recently created run should be first
		expect(recent[0].id).toBe(r3.id);
	});

	it('honours the limit parameter', async () => {
		const { store } = await freshImport();
		for (let i = 0; i < 5; i++) {
			await store.createRun([]);
		}
		const recent = await store.getRecentRuns(3);
		expect(recent).toHaveLength(3);
	});

	it('returns all runs when limit is larger than available', async () => {
		const { store } = await freshImport();
		await store.createRun([]);
		const recent = await store.getRecentRuns(100);
		expect(recent).toHaveLength(1);
	});

	it('returns empty array when no runs exist', async () => {
		const { store } = await freshImport();
		const recent = await store.getRecentRuns();
		expect(recent).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// addEntries
// ---------------------------------------------------------------------------

describe('discovery-store – addEntries', () => {
	it('adds new entries to the store', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		const e1 = makeEntry({ discoveryRunId: run.id });
		const e2 = makeEntry({ discoveryRunId: run.id, name: 'Test Scooter X2' });

		await store.addEntries([e1, e2]);

		const entries = await store.getEntriesForRun(run.id);
		expect(entries).toHaveLength(2);
	});

	it('deduplicates by normalised name within 30 days', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);

		const e1 = makeEntry({ discoveryRunId: run.id, name: 'Test Scooter X1' });
		// Same normalised name (spaces → removed): 'testscooterx1'
		const e2 = makeEntry({ discoveryRunId: run.id, name: 'Test-Scooter-X1' });

		await store.addEntries([e1, e2]);

		const all = await store.getEntriesForRun(run.id);
		expect(all).toHaveLength(1);
	});

	it('adds entries with different names without dedup', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);

		await store.addEntries([
			makeEntry({ discoveryRunId: run.id, name: 'Scooter Alpha' }),
			makeEntry({ discoveryRunId: run.id, name: 'Scooter Beta' }),
		]);

		const all = await store.getEntriesForRun(run.id);
		expect(all).toHaveLength(2);
	});

	it('writes to disk after adding entries', async () => {
		const { store, fsMock } = await freshImport();
		const run = await store.createRun([]);
		const callsBefore = fsMock.writeFile.mock.calls.length;
		await store.addEntries([makeEntry({ discoveryRunId: run.id })]);
		expect(fsMock.writeFile.mock.calls.length).toBeGreaterThan(callsBefore);
	});
});

// ---------------------------------------------------------------------------
// updateEntryDisposition
// ---------------------------------------------------------------------------

describe('discovery-store – updateEntryDisposition', () => {
	it('updates disposition to promoted', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		const entry = makeEntry({ id: 'entry-x', discoveryRunId: run.id });
		await store.addEntries([entry]);

		await store.updateEntryDisposition('entry-x', 'promoted', 'test_scooter_x1');

		const entries = await store.getEntriesForRun(run.id);
		const updated = entries.find((e) => e.id === 'entry-x')!;
		expect(updated.disposition).toBe('promoted');
		expect(updated.candidateKey).toBe('test_scooter_x1');
	});

	it('updates disposition to dismissed', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		const entry = makeEntry({ id: 'entry-y', discoveryRunId: run.id });
		await store.addEntries([entry]);

		await store.updateEntryDisposition('entry-y', 'dismissed');

		const entries = await store.getEntriesForRun(run.id);
		const updated = entries.find((e) => e.id === 'entry-y')!;
		expect(updated.disposition).toBe('dismissed');
	});

	it('does nothing when entryId does not exist', async () => {
		const { store } = await freshImport();
		await expect(store.updateEntryDisposition('missing-id', 'promoted')).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getUnreviewedEntries
// ---------------------------------------------------------------------------

describe('discovery-store – getUnreviewedEntries', () => {
	it('returns entries with disposition=null and isKnown=false', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.addEntries([
			makeEntry({ id: 'new1', discoveryRunId: run.id, disposition: null, isKnown: false }),
			makeEntry({ id: 'known1', discoveryRunId: run.id, disposition: null, isKnown: true }),
			makeEntry({ id: 'promoted1', discoveryRunId: run.id, disposition: 'promoted', isKnown: false }),
		]);

		const unreviewed = await store.getUnreviewedEntries();
		expect(unreviewed).toHaveLength(1);
		expect(unreviewed[0].id).toBe('new1');
	});

	it('returns empty array when all entries are reviewed or known', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.addEntries([
			makeEntry({ discoveryRunId: run.id, disposition: 'dismissed', isKnown: false }),
			makeEntry({ discoveryRunId: run.id, disposition: null, isKnown: true }),
		]);

		const unreviewed = await store.getUnreviewedEntries();
		expect(unreviewed).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// URL health tracking
// ---------------------------------------------------------------------------

describe('discovery-store – updateUrlHealth', () => {
	it('records a successful health check (status 200)', async () => {
		const { store } = await freshImport();
		await store.updateUrlHealth('https://example.com', 200, undefined, 5);

		const health = await store.getUrlHealth();
		expect(health['https://example.com']).toBeDefined();
		expect(health['https://example.com'].lastStatus).toBe(200);
		expect(health['https://example.com'].consecutiveFailures).toBe(0);
		expect(health['https://example.com'].productsFoundLast).toBe(5);
	});

	it('records a failed health check and increments consecutiveFailures', async () => {
		const { store } = await freshImport();
		await store.updateUrlHealth('https://example.com', 503, 'Service Unavailable');

		const health = await store.getUrlHealth();
		expect(health['https://example.com'].consecutiveFailures).toBe(1);
		expect(health['https://example.com'].lastError).toBe('Service Unavailable');
	});

	it('resets consecutiveFailures to 0 on success after failure', async () => {
		const { store } = await freshImport();
		const url = 'https://example.com';
		await store.updateUrlHealth(url, 500, 'error');
		await store.updateUrlHealth(url, 500, 'error');
		await store.updateUrlHealth(url, 200);

		const health = await store.getUrlHealth();
		expect(health[url].consecutiveFailures).toBe(0);
	});

	it('accumulates consecutiveFailures across calls', async () => {
		const { store } = await freshImport();
		const url = 'https://fail.com';
		await store.updateUrlHealth(url, 500, 'err');
		await store.updateUrlHealth(url, 500, 'err');
		await store.updateUrlHealth(url, 500, 'err');

		const health = await store.getUrlHealth();
		expect(health[url].consecutiveFailures).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// getHealthyUrls
// ---------------------------------------------------------------------------

describe('discovery-store – getHealthyUrls', () => {
	it('returns all URLs when cache is empty (no health data loaded)', async () => {
		// freshImport resets cache to null; getHealthyUrls is sync and returns all when cache=null
		vi.resetModules();
		vi.doMock('fs/promises', () => ({
			readFile: vi.fn().mockResolvedValue(JSON.stringify({ runs: [], entries: [], urlHealth: {} })),
			writeFile: vi.fn().mockResolvedValue(undefined),
			mkdir: vi.fn().mockResolvedValue(undefined),
		}));
		vi.doMock('fs', () => ({ existsSync: vi.fn().mockReturnValue(false) }));

		const store = await import('$lib/server/verification/discovery-store');
		const urls = ['https://a.com', 'https://b.com'];
		// Cache not loaded yet → all URLs pass through
		const healthy = store.getHealthyUrls(urls);
		expect(healthy).toEqual(urls);
	});

	it('excludes disabled URLs after health data is loaded', async () => {
		const { store } = await freshImport();
		const url = 'https://disabled.com';
		await store.updateUrlHealth(url, 200);

		// Manually mark as disabled via internal state by simulating 3 failures
		await store.updateUrlHealth(url, 500, 'err');
		await store.updateUrlHealth(url, 500, 'err');
		await store.updateUrlHealth(url, 500, 'err');

		const healthy = store.getHealthyUrls([url, 'https://ok.com']);
		// url has 3 consecutive failures → excluded
		expect(healthy).not.toContain(url);
		expect(healthy).toContain('https://ok.com');
	});

	it('allows URLs with no health record', async () => {
		const { store } = await freshImport();
		// Load the cache by making a call
		await store.getRecentRuns();

		const newUrl = 'https://brand-new.com';
		const healthy = store.getHealthyUrls([newUrl]);
		expect(healthy).toContain(newUrl);
	});
});

// ---------------------------------------------------------------------------
// recoverOrphanedRuns
// ---------------------------------------------------------------------------

describe('discovery-store – recoverOrphanedRuns', () => {
	it('marks orphaned running runs as failed', async () => {
		const { store } = await freshImport();
		const _run = await store.createRun([]);
		// The run remains 'running' — simulate orphan
		const count = await store.recoverOrphanedRuns();
		expect(count).toBe(1);

		const runs = await store.getRecentRuns();
		expect(runs[0].status).toBe('failed');
		expect(runs[0].errors.some((e) => e.includes('orphaned'))).toBe(true);
	});

	it('returns 0 when there are no orphaned runs', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.completeRun(run.id, {
			totalFound: 0,
			totalNew: 0,
			totalKnown: 0,
			candidatesCreated: 0,
			errors: [],
		});

		const count = await store.recoverOrphanedRuns();
		expect(count).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('discovery-store – getStats', () => {
	it('returns aggregate statistics', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		await store.addEntries([
			makeEntry({ discoveryRunId: run.id, isKnown: false, disposition: null }),
			makeEntry({ discoveryRunId: run.id, isKnown: true, disposition: null, name: 'Known Scooter' }),
		]);

		const stats = await store.getStats();
		expect(stats.totalRuns).toBe(1);
		expect(stats.totalEntries).toBe(2);
		expect(stats.totalNew).toBe(1);
		expect(stats.pendingReview).toBe(1);
	});

	it('counts healthy and dead URLs', async () => {
		const { store } = await freshImport();
		await store.updateUrlHealth('https://good.com', 200);
		// 3 failures → dead
		await store.updateUrlHealth('https://bad.com', 500, 'e');
		await store.updateUrlHealth('https://bad.com', 500, 'e');
		await store.updateUrlHealth('https://bad.com', 500, 'e');

		const stats = await store.getStats();
		expect(stats.healthyUrls).toBe(1);
		expect(stats.deadUrls).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getEntriesForRun
// ---------------------------------------------------------------------------

describe('discovery-store – getEntriesForRun', () => {
	it('returns only entries belonging to the specified run', async () => {
		const { store } = await freshImport();
		const r1 = await store.createRun([]);
		const r2 = await store.createRun([]);

		await store.addEntries([
			makeEntry({ discoveryRunId: r1.id, name: 'Scooter A' }),
			makeEntry({ discoveryRunId: r2.id, name: 'Scooter B' }),
		]);

		const r1Entries = await store.getEntriesForRun(r1.id);
		expect(r1Entries).toHaveLength(1);
		expect(r1Entries[0].name).toBe('Scooter A');
	});

	it('returns empty array when run has no entries', async () => {
		const { store } = await freshImport();
		const run = await store.createRun([]);
		const entries = await store.getEntriesForRun(run.id);
		expect(entries).toHaveLength(0);
	});
});
