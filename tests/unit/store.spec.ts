import { describe, it, expect, beforeEach } from 'vitest';
import type { VerificationStore } from '$lib/server/verification/store';
import type { ScooterVerification, SourceEntry, PriceObservation } from '$lib/server/verification/types';

// We test the high-level store operations directly, injecting a fake in-memory
// VerificationStore so no filesystem access occurs.

import { addSource, removeSource, updateFieldStatus, addPriceObservation } from '$lib/server/verification/store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmptyVerification(scooterKey: string): ScooterVerification {
	return {
		scooterKey,
		fields: {},
		priceHistory: [],
		lastUpdated: new Date().toISOString(),
		overallConfidence: 0,
	};
}

function makeSource(overrides: Partial<SourceEntry> = {}): SourceEntry {
	return {
		id: 'src-1',
		type: 'manufacturer',
		name: 'Manufacturer Page',
		url: 'https://example.com/specs',
		value: 45,
		unit: 'km/h',
		fetchedAt: new Date().toISOString(),
		addedBy: 'manual',
		...overrides,
	};
}

/** Build a simple in-memory VerificationStore over a mutable object */
function makeMemStore(initial: Record<string, ScooterVerification> = {}): VerificationStore {
	const db: Record<string, ScooterVerification> = { ...initial };
	return {
		async get(key) {
			return db[key] ?? null;
		},
		async set(key, data) {
			db[key] = data;
		},
		async getAll() {
			return { ...db };
		},
	};
}

// ---------------------------------------------------------------------------
// addSource
// ---------------------------------------------------------------------------

describe('store – addSource', () => {
	let store: VerificationStore;

	beforeEach(() => {
		store = makeMemStore();
	});

	it('adds a new source to an empty field', async () => {
		const src = makeSource();
		const result = await addSource(store, 'ninebot_max', 'topSpeed', src);

		expect(result.fields.topSpeed).toBeDefined();
		expect(result.fields.topSpeed!.sources).toHaveLength(1);
		expect(result.fields.topSpeed!.sources[0].id).toBe('src-1');
	});

	it('creates the scooter entry if it does not exist', async () => {
		const src = makeSource();
		const result = await addSource(store, 'brand_new_scooter', 'range', src);

		expect(result.scooterKey).toBe('brand_new_scooter');
		expect(result.fields.range).toBeDefined();
	});

	it('deduplicates by URL — updates the existing source instead of appending', async () => {
		const url = 'https://example.com/specs';
		const src1 = makeSource({ id: 'src-1', url, value: 45 });
		const src2 = makeSource({ id: 'src-2', url, value: 50 });

		await addSource(store, 'ninebot_max', 'topSpeed', src1);
		const result = await addSource(store, 'ninebot_max', 'topSpeed', src2);

		// Should still be 1 source (replaced, not appended)
		expect(result.fields.topSpeed!.sources).toHaveLength(1);
		expect(result.fields.topSpeed!.sources[0].value).toBe(50);
		expect(result.fields.topSpeed!.sources[0].id).toBe('src-2');
	});

	it('appends a new source when URLs differ', async () => {
		const src1 = makeSource({ id: 'src-1', url: 'https://a.com' });
		const src2 = makeSource({ id: 'src-2', url: 'https://b.com' });

		await addSource(store, 'ninebot_max', 'topSpeed', src1);
		const result = await addSource(store, 'ninebot_max', 'topSpeed', src2);

		expect(result.fields.topSpeed!.sources).toHaveLength(2);
	});

	it('increments source count and recomputes confidence', async () => {
		const src = makeSource({ id: 'src-1', url: 'https://a.com' });
		const result = await addSource(store, 'ninebot_max', 'topSpeed', src);

		expect(result.fields.topSpeed!.confidence).toBeGreaterThan(0);
		expect(result.overallConfidence).toBeGreaterThan(0);
	});

	it('updates lastUpdated timestamp', async () => {
		const before = new Date().toISOString();
		const result = await addSource(store, 'ninebot_max', 'topSpeed', makeSource());
		expect(result.lastUpdated >= before).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// removeSource
// ---------------------------------------------------------------------------

describe('store – removeSource', () => {
	let store: VerificationStore;

	beforeEach(() => {
		const initial = makeEmptyVerification('ninebot_max');
		initial.fields.topSpeed = {
			status: 'verified',
			sources: [
				makeSource({ id: 'src-1', url: 'https://a.com', value: 45 }),
				makeSource({ id: 'src-2', url: 'https://b.com', value: 46 }),
			],
			confidence: 60,
		};
		store = makeMemStore({ ninebot_max: initial });
	});

	it('removes a source by sourceId', async () => {
		const result = await removeSource(store, 'ninebot_max', 'topSpeed', 'src-1');

		expect(result).not.toBeNull();
		expect(result!.fields.topSpeed!.sources).toHaveLength(1);
		expect(result!.fields.topSpeed!.sources[0].id).toBe('src-2');
	});

	it('returns null for an unknown scooterKey', async () => {
		const result = await removeSource(store, 'unknown_key', 'topSpeed', 'src-1');
		expect(result).toBeNull();
	});

	it('returns the existing data unchanged when field does not exist', async () => {
		const result = await removeSource(store, 'ninebot_max', 'range', 'src-1');
		// range field doesn't exist — should return data as-is (not null)
		expect(result).not.toBeNull();
		expect(result!.fields.range).toBeUndefined();
	});

	it('resets status to unverified when last source is removed', async () => {
		// Remove both sources one by one
		await removeSource(store, 'ninebot_max', 'topSpeed', 'src-1');
		const result = await removeSource(store, 'ninebot_max', 'topSpeed', 'src-2');

		expect(result!.fields.topSpeed!.sources).toHaveLength(0);
		expect(result!.fields.topSpeed!.status).toBe('unverified');
	});

	it('clears verifiedValue when last source is removed', async () => {
		// First give it a verifiedValue
		const data = (await store.get('ninebot_max')) as ScooterVerification;
		data.fields.topSpeed!.verifiedValue = 45;
		await store.set('ninebot_max', data);

		await removeSource(store, 'ninebot_max', 'topSpeed', 'src-1');
		const result = await removeSource(store, 'ninebot_max', 'topSpeed', 'src-2');

		expect(result!.fields.topSpeed!.verifiedValue).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// updateFieldStatus
// ---------------------------------------------------------------------------

describe('store – updateFieldStatus', () => {
	let store: VerificationStore;

	beforeEach(() => {
		const initial = makeEmptyVerification('ninebot_max');
		initial.fields.topSpeed = {
			status: 'unverified',
			sources: [makeSource()],
			confidence: 50,
		};
		store = makeMemStore({ ninebot_max: initial });
	});

	it('sets status and verifiedValue', async () => {
		const result = await updateFieldStatus(store, 'ninebot_max', 'topSpeed', 'verified', 45);

		expect(result!.fields.topSpeed!.status).toBe('verified');
		expect(result!.fields.topSpeed!.verifiedValue).toBe(45);
	});

	it('sets lastVerified timestamp when status is "verified"', async () => {
		const before = new Date().toISOString();
		const result = await updateFieldStatus(store, 'ninebot_max', 'topSpeed', 'verified', 45);

		expect(result!.fields.topSpeed!.lastVerified).toBeDefined();
		expect(result!.fields.topSpeed!.lastVerified! >= before).toBe(true);
	});

	it('does not set lastVerified for non-verified statuses', async () => {
		const result = await updateFieldStatus(store, 'ninebot_max', 'topSpeed', 'disputed');

		expect(result!.fields.topSpeed!.lastVerified).toBeUndefined();
	});

	it('returns null for an unknown scooterKey', async () => {
		const result = await updateFieldStatus(store, 'unknown_key', 'topSpeed', 'verified');
		expect(result).toBeNull();
	});

	it('creates field entry if the field is absent', async () => {
		const result = await updateFieldStatus(store, 'ninebot_max', 'range', 'disputed');

		expect(result!.fields.range).toBeDefined();
		expect(result!.fields.range!.status).toBe('disputed');
		expect(result!.fields.range!.sources).toHaveLength(0);
	});

	it('does not overwrite verifiedValue when none is passed', async () => {
		await updateFieldStatus(store, 'ninebot_max', 'topSpeed', 'verified', 45);
		const result = await updateFieldStatus(store, 'ninebot_max', 'topSpeed', 'outdated');

		// verifiedValue should still be 45
		expect(result!.fields.topSpeed!.verifiedValue).toBe(45);
	});
});

// ---------------------------------------------------------------------------
// addPriceObservation
// ---------------------------------------------------------------------------

describe('store – addPriceObservation', () => {
	let store: VerificationStore;

	beforeEach(() => {
		store = makeMemStore();
	});

	it('adds a price observation to a new scooter entry', async () => {
		const obs: PriceObservation = {
			price: 799,
			currency: 'USD',
			source: 'Amazon',
			observedAt: '2025-01-01T00:00:00.000Z',
		};
		const result = await addPriceObservation(store, 'ninebot_max', obs);

		expect(result.priceHistory).toHaveLength(1);
		expect(result.priceHistory[0].price).toBe(799);
	});

	it('sorts price history by date descending (most recent first)', async () => {
		const older: PriceObservation = {
			price: 799,
			currency: 'USD',
			source: 'Amazon',
			observedAt: '2024-01-01T00:00:00.000Z',
		};
		const newer: PriceObservation = {
			price: 749,
			currency: 'USD',
			source: 'Amazon',
			observedAt: '2025-06-01T00:00:00.000Z',
		};

		await addPriceObservation(store, 'ninebot_max', older);
		const result = await addPriceObservation(store, 'ninebot_max', newer);

		expect(result.priceHistory[0].price).toBe(749);
		expect(result.priceHistory[1].price).toBe(799);
	});

	it('handles existing priceHistory array', async () => {
		const initial = makeEmptyVerification('ninebot_max');
		initial.priceHistory = [
			{
				price: 600,
				currency: 'USD',
				source: 'Old Store',
				observedAt: '2023-01-01T00:00:00.000Z',
			},
		];
		const storeWithData = makeMemStore({ ninebot_max: initial });

		const obs: PriceObservation = {
			price: 650,
			currency: 'USD',
			source: 'New Store',
			observedAt: '2024-06-01T00:00:00.000Z',
		};
		const result = await addPriceObservation(storeWithData, 'ninebot_max', obs);

		expect(result.priceHistory).toHaveLength(2);
		expect(result.priceHistory[0].price).toBe(650); // newer first
	});

	it('updates lastUpdated', async () => {
		const before = new Date().toISOString();
		const obs: PriceObservation = {
			price: 799,
			currency: 'USD',
			source: 'Amazon',
			observedAt: new Date().toISOString(),
		};
		const result = await addPriceObservation(store, 'ninebot_max', obs);
		expect(result.lastUpdated >= before).toBe(true);
	});
});
