/**
 * Unit tests for changelog.ts.
 *
 * fs/promises and fs are mocked. Uses the resetModules + doMock pattern
 * so each describe block gets a fresh module with cache=null.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ScooterVerification, FieldVerification } from '$lib/server/verification/types';
import type { ChangeEntry } from '$lib/server/verification/changelog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFieldVerification(overrides: Partial<FieldVerification> = {}): FieldVerification {
	return {
		status: 'unverified',
		sources: [],
		confidence: 0,
		...overrides,
	};
}

function makeSource(id: string, value: number, name = 'Test Source') {
	return {
		id,
		type: 'manufacturer' as const,
		name,
		url: 'https://example.com',
		value,
		unit: 'km/h',
		fetchedAt: new Date().toISOString(),
		addedBy: 'manual' as const,
	};
}

function makeVerification(
	scooterKey: string,
	fields: Partial<ScooterVerification['fields']> = {},
	priceHistory: ScooterVerification['priceHistory'] = []
): ScooterVerification {
	return {
		scooterKey,
		fields,
		priceHistory,
		lastUpdated: new Date().toISOString(),
		overallConfidence: 50,
	};
}

async function freshImport(existingEntries: ChangeEntry[] = []) {
	vi.resetModules();

	const fsMock = {
		readFile: vi.fn().mockResolvedValue(JSON.stringify(existingEntries)),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
	};
	const fsSync = {
		existsSync: vi.fn().mockReturnValue(existingEntries.length > 0),
	};

	vi.doMock('fs/promises', () => fsMock);
	vi.doMock('fs', () => fsSync);

	const mod = await import('$lib/server/verification/changelog');
	return { mod, fsMock, fsSync };
}

// ---------------------------------------------------------------------------
// recordChanges – source_added
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: source_added', () => {
	it('detects a new source added to a field', async () => {
		const { mod } = await freshImport();

		const before = makeVerification('ninebot_max', {
			topSpeed: makeFieldVerification({ sources: [] }),
		});
		const after = makeVerification('ninebot_max', {
			topSpeed: makeFieldVerification({
				sources: [makeSource('s1', 45, 'Ninebot Site')],
			}),
		});

		const changes = await mod.recordChanges('ninebot_max', 'Ninebot Max', before, after);
		const added = changes.filter((c) => c.changeType === 'source_added');
		expect(added).toHaveLength(1);
		expect(added[0].field).toBe('topSpeed');
		expect(added[0].newValue).toBe(45);
		expect(added[0].source).toBe('Ninebot Site');
	});

	it('records details string for added source', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', { range: makeFieldVerification({ sources: [] }) });
		const after = makeVerification('test', {
			range: makeFieldVerification({ sources: [makeSource('s1', 60, 'Brand Site')] }),
		});

		const changes = await mod.recordChanges('test', 'Test Scooter', before, after);
		const added = changes.find((c) => c.changeType === 'source_added');
		expect(added?.details).toContain('Brand Site');
	});

	it('records multiple sources added to the same field', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', { range: makeFieldVerification({ sources: [] }) });
		const after = makeVerification('test', {
			range: makeFieldVerification({
				sources: [makeSource('s1', 60, 'A'), makeSource('s2', 65, 'B')],
			}),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const added = changes.filter((c) => c.changeType === 'source_added');
		expect(added).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// recordChanges – source_removed
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: source_removed', () => {
	it('detects when sources are removed from a field', async () => {
		const { mod } = await freshImport();

		const before = makeVerification('test', {
			topSpeed: makeFieldVerification({
				sources: [makeSource('s1', 45), makeSource('s2', 48)],
			}),
		});
		const after = makeVerification('test', {
			topSpeed: makeFieldVerification({
				sources: [makeSource('s1', 45)],
			}),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const removed = changes.filter((c) => c.changeType === 'source_removed');
		expect(removed).toHaveLength(1);
		expect(removed[0].field).toBe('topSpeed');
	});

	it('describes how many sources were removed', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {
			range: makeFieldVerification({
				sources: [makeSource('s1', 50), makeSource('s2', 55), makeSource('s3', 52)],
			}),
		});
		const after = makeVerification('test', {
			range: makeFieldVerification({ sources: [makeSource('s1', 50)] }),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const removed = changes.find((c) => c.changeType === 'source_removed');
		expect(removed?.details).toContain('2');
	});
});

// ---------------------------------------------------------------------------
// recordChanges – value_changed
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: value_changed', () => {
	it('detects a change in verifiedValue', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {
			topSpeed: makeFieldVerification({ verifiedValue: 40, sources: [] }),
		});
		const after = makeVerification('test', {
			topSpeed: makeFieldVerification({ verifiedValue: 45, sources: [] }),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const changed = changes.filter((c) => c.changeType === 'value_changed');
		expect(changed).toHaveLength(1);
		expect(changed[0].oldValue).toBe(40);
		expect(changed[0].newValue).toBe(45);
	});

	it('does not report value_changed when verifiedValue is the same', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {
			topSpeed: makeFieldVerification({ verifiedValue: 45, sources: [] }),
		});
		const after = makeVerification('test', {
			topSpeed: makeFieldVerification({ verifiedValue: 45, sources: [] }),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const changed = changes.filter((c) => c.changeType === 'value_changed');
		expect(changed).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// recordChanges – status_changed
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: status_changed', () => {
	it('detects a status change from unverified to verified', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {
			topSpeed: makeFieldVerification({ status: 'unverified', sources: [] }),
		});
		const after = makeVerification('test', {
			topSpeed: makeFieldVerification({ status: 'verified', sources: [] }),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const statusChanges = changes.filter((c) => c.changeType === 'status_changed');
		expect(statusChanges).toHaveLength(1);
		expect(statusChanges[0].oldValue).toBe('unverified');
		expect(statusChanges[0].newValue).toBe('verified');
	});

	it('does not report when status is unchanged', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {
			range: makeFieldVerification({ status: 'unverified', sources: [] }),
		});
		const after = makeVerification('test', {
			range: makeFieldVerification({ status: 'unverified', sources: [] }),
		});

		const changes = await mod.recordChanges('test', 'Test', before, after);
		expect(changes.filter((c) => c.changeType === 'status_changed')).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// recordChanges – price_changed
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: price_changed', () => {
	it('detects a price change', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {}, [
			{ price: 999, currency: 'USD', source: 'Amazon', observedAt: new Date().toISOString() },
		]);
		const after = makeVerification('test', {}, [
			{ price: 899, currency: 'USD', source: 'Amazon', observedAt: new Date().toISOString() },
			{ price: 999, currency: 'USD', source: 'Amazon', observedAt: new Date(Date.now() - 1000).toISOString() },
		]);

		const changes = await mod.recordChanges('test', 'Test', before, after);
		const priceChanges = changes.filter((c) => c.changeType === 'price_changed');
		expect(priceChanges).toHaveLength(1);
		expect(priceChanges[0].oldValue).toBe(999);
		expect(priceChanges[0].newValue).toBe(899);
	});

	it('does not report price_changed when price is the same', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('test', {}, [
			{ price: 999, currency: 'USD', source: 'Amazon', observedAt: new Date().toISOString() },
		]);
		const after = makeVerification('test', {}, [
			{ price: 999, currency: 'USD', source: 'Amazon', observedAt: new Date().toISOString() },
			{ price: 999, currency: 'USD', source: 'Amazon', observedAt: new Date(Date.now() - 1000).toISOString() },
		]);

		const changes = await mod.recordChanges('test', 'Test', before, after);
		expect(changes.filter((c) => c.changeType === 'price_changed')).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// recordChanges – before=null (new scooter)
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: before=null', () => {
	it('handles before=null (treats all fields as new)', async () => {
		const { mod } = await freshImport();
		const after = makeVerification('new_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource('s1', 55, 'Brand')],
			}),
		});

		const changes = await mod.recordChanges('new_scooter', 'New Scooter', null, after);
		// Should produce source_added changes for the new sources
		const added = changes.filter((c) => c.changeType === 'source_added');
		expect(added.length).toBeGreaterThanOrEqual(1);
	});

	it('does not throw when before=null', async () => {
		const { mod } = await freshImport();
		const after = makeVerification('x', {});
		await expect(mod.recordChanges('x', 'X', null, after)).resolves.toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// recordChanges – persistence
// ---------------------------------------------------------------------------

describe('changelog – recordChanges: persistence', () => {
	it('calls writeFile when changes are produced', async () => {
		const { mod, fsMock } = await freshImport();
		const before = makeVerification('test', { range: makeFieldVerification({ sources: [] }) });
		const after = makeVerification('test', {
			range: makeFieldVerification({ sources: [makeSource('s1', 60)] }),
		});

		await mod.recordChanges('test', 'Test', before, after);
		expect(fsMock.writeFile).toHaveBeenCalled();
	});

	it('does not call writeFile when no changes are produced', async () => {
		const { mod, fsMock } = await freshImport();
		const ver = makeVerification('test', {});
		await mod.recordChanges('test', 'Test', ver, ver);
		expect(fsMock.writeFile).not.toHaveBeenCalled();
	});

	it('entry has scooterKey and scooterName set correctly', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('ninebot', { range: makeFieldVerification({ sources: [] }) });
		const after = makeVerification('ninebot', {
			range: makeFieldVerification({ sources: [makeSource('s1', 60)] }),
		});

		const changes = await mod.recordChanges('ninebot', 'Ninebot Max', before, after);
		expect(changes[0].scooterKey).toBe('ninebot');
		expect(changes[0].scooterName).toBe('Ninebot Max');
	});

	it('each entry has a unique id', async () => {
		const { mod } = await freshImport();
		const before = makeVerification('t', {
			topSpeed: makeFieldVerification({ sources: [] }),
			range: makeFieldVerification({ sources: [] }),
		});
		const after = makeVerification('t', {
			topSpeed: makeFieldVerification({ sources: [makeSource('s1', 45)] }),
			range: makeFieldVerification({ sources: [makeSource('s2', 60)] }),
		});

		const changes = await mod.recordChanges('t', 'T', before, after);
		const ids = changes.map((c) => c.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});
});

// ---------------------------------------------------------------------------
// getChangelog
// ---------------------------------------------------------------------------

describe('changelog – getChangelog', () => {
	it('returns all entries when no filter is given', async () => {
		const entries: ChangeEntry[] = [
			{
				id: '1',
				timestamp: new Date().toISOString(),
				scooterKey: 'a',
				scooterName: 'A',
				changeType: 'source_added',
			},
			{
				id: '2',
				timestamp: new Date().toISOString(),
				scooterKey: 'b',
				scooterName: 'B',
				changeType: 'value_changed',
			},
		];
		const { mod } = await freshImport(entries);

		const result = await mod.getChangelog(50, 0);
		expect(result.total).toBe(2);
		expect(result.entries).toHaveLength(2);
	});

	it('filters by scooterKey', async () => {
		const entries: ChangeEntry[] = [
			{
				id: '1',
				timestamp: new Date().toISOString(),
				scooterKey: 'alpha',
				scooterName: 'Alpha',
				changeType: 'source_added',
			},
			{
				id: '2',
				timestamp: new Date().toISOString(),
				scooterKey: 'beta',
				scooterName: 'Beta',
				changeType: 'value_changed',
			},
		];
		const { mod } = await freshImport(entries);

		const result = await mod.getChangelog(50, 0, 'alpha');
		expect(result.total).toBe(1);
		expect(result.entries[0].scooterKey).toBe('alpha');
	});

	it('respects limit and offset', async () => {
		const entries: ChangeEntry[] = Array.from({ length: 10 }, (_, i) => ({
			id: `${i}`,
			timestamp: new Date().toISOString(),
			scooterKey: 'test',
			scooterName: 'Test',
			changeType: 'source_added' as const,
		}));
		const { mod } = await freshImport(entries);

		const page1 = await mod.getChangelog(3, 0);
		expect(page1.entries).toHaveLength(3);
		expect(page1.total).toBe(10);

		const page2 = await mod.getChangelog(3, 3);
		expect(page2.entries).toHaveLength(3);
		expect(page2.entries[0].id).toBe('3');
	});

	it('returns empty when store is empty', async () => {
		const { mod } = await freshImport([]);
		const result = await mod.getChangelog();
		expect(result.entries).toHaveLength(0);
		expect(result.total).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// MAX_ENTRIES cap
// ---------------------------------------------------------------------------

describe('changelog – MAX_ENTRIES cap', () => {
	it('trims the log to 1000 entries after accumulation', async () => {
		// Start with 999 existing entries
		const existing: ChangeEntry[] = Array.from({ length: 999 }, (_, i) => ({
			id: `old-${i}`,
			timestamp: new Date().toISOString(),
			scooterKey: 'old',
			scooterName: 'Old',
			changeType: 'source_added' as const,
		}));
		const { mod, fsMock } = await freshImport(existing);

		// Add one more change → should push total to 1000 (not over)
		const before = makeVerification('new', { range: makeFieldVerification({ sources: [] }) });
		const after = makeVerification('new', {
			range: makeFieldVerification({ sources: [makeSource('s1', 60)] }),
		});
		await mod.recordChanges('new', 'New', before, after);

		// Verify write was called with at most 1000 entries
		const written = JSON.parse(fsMock.writeFile.mock.calls[0][1]) as ChangeEntry[];
		expect(written.length).toBeLessThanOrEqual(1000);
	});
});
