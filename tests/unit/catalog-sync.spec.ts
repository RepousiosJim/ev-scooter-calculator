import { describe, it, expect } from 'vitest';
import { syncCatalog, syncRecord, catalogSpecs, isCatalogSource } from '$lib/server/verification/catalog-sync';
import type { VerificationStore } from '$lib/server/verification/store';
import type { ScooterVerification, SourceEntry } from '$lib/server/verification/types';
import { presets, presetMetadata } from '$lib/data/presets';

function memStore(initial: Record<string, ScooterVerification> = {}) {
	const db: Record<string, ScooterVerification> = structuredClone(initial);
	const store: VerificationStore = {
		get: async (k) => db[k] ?? null,
		set: async (k, v) => {
			db[k] = v;
		},
		getAll: async () => db,
		delete: async (k) => {
			delete db[k];
		},
	};
	return { store, db };
}

const review = (id: string, value: number): SourceEntry => ({
	id,
	type: 'review',
	name: id,
	value,
	unit: 'km',
	fetchedAt: '2026-01-01T00:00:00.000Z',
	addedBy: 'scraper',
});

function record(
	key: string,
	fields: ScooterVerification['fields'],
	priceHistory: ScooterVerification['priceHistory'] = []
) {
	return { scooterKey: key, fields, priceHistory, lastUpdated: '', overallConfidence: 0 };
}

describe('catalogSpecs', () => {
	it('reads claims from metadata and hardware from the config (total peak power)', () => {
		const specs = catalogSpecs('navee_gt3');
		expect(specs.topSpeed).toBe(presetMetadata.navee_gt3.manufacturer.topSpeed);
		expect(specs.motorWatts).toBe(presets.navee_gt3.watts * presets.navee_gt3.motors);
		expect(specs.voltage).toBe(presets.navee_gt3.v);
	});
});

describe('syncRecord', () => {
	it('is a no-op on a record that is already in sync', () => {
		const synced = syncRecord('navee_gt3', null)!;
		expect(syncRecord('navee_gt3', synced)).toBeNull();
	});

	it('clears an automatic resolution when the sources change', () => {
		const stale = record('navee_gt3', {
			range: {
				status: 'unverified',
				confidence: 50,
				verifiedValue: 999,
				notes: 'Auto-resolved: preferred manufacturer source',
				sources: [{ ...review('catalog-range', 999), type: 'manufacturer' }],
			},
		});
		const next = syncRecord('navee_gt3', stale)!;
		expect(next.fields.range!.verifiedValue).toBeUndefined();
		expect(next.fields.range!.sources.find(isCatalogSource)!.value).toBe(presetMetadata.navee_gt3.manufacturer.range);
	});

	it('collapses duplicate price observations', () => {
		const obs = { price: 500, currency: 'USD', source: 'Shop', observedAt: '2026-01-01T00:00:00.000Z' };
		const next = syncRecord('navee_gt3', {
			...syncRecord('navee_gt3', null)!,
			priceHistory: [obs, { ...obs, observedAt: '2026-02-01T00:00:00.000Z' }],
		})!;
		expect(next.priceHistory).toHaveLength(1);
		expect(next.priceHistory[0].observedAt).toBe(obs.observedAt);
	});
});

describe('syncCatalog', () => {
	it('merges a renamed key into the current one and deletes removed models', async () => {
		const { store, db } = memStore({
			m365_pro_2: record('m365_pro_2', {
				range: { status: 'unverified', confidence: 40, sources: [review('esg', 33)] },
			}),
			vsett_7_plus: record('vsett_7_plus', {}),
		});

		const result = await syncCatalog(store);

		expect(result.merged).toEqual([{ from: 'm365_pro_2', to: 'xiaomi_pro_2' }]);
		expect(result.deleted).toEqual(['vsett_7_plus']);
		expect(db.m365_pro_2).toBeUndefined();
		expect(db.vsett_7_plus).toBeUndefined();
		const ids = db.xiaomi_pro_2.fields.range!.sources.map((s) => s.id);
		expect(ids).toEqual(expect.arrayContaining(['esg', 'catalog-range']));
	});

	it('creates a record for every catalog scooter, and a second run changes nothing', async () => {
		const { store, db } = memStore();
		await syncCatalog(store);
		expect(Object.keys(db)).toHaveLength(Object.keys(presetMetadata).filter((k) => k !== 'custom').length);

		const again = await syncCatalog(store);
		expect(again.updated).toEqual([]);
	});

	it('writes in batches when the store supports it', async () => {
		const { store } = memStore();
		const batches: number[] = [];
		store.setMany = async (records) => {
			batches.push(records.length);
		};

		const result = await syncCatalog(store);

		expect(batches.reduce((a, b) => a + b, 0)).toBe(result.updated.length);
		expect(Math.max(...batches)).toBeLessThanOrEqual(50);
	});
});
