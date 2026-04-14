import { describe, it, expect } from 'vitest';
import {
	manufacturers,
	getManufacturer,
	getManufacturerForScooter,
	getScrapableManufacturers,
} from '$lib/server/verification/manufacturers';

describe('manufacturers array', () => {
	it('is non-empty', () => {
		expect(manufacturers.length).toBeGreaterThan(0);
	});

	it('every manufacturer has required fields', () => {
		for (const m of manufacturers) {
			expect(typeof m.id).toBe('string');
			expect(m.id.length).toBeGreaterThan(0);
			expect(typeof m.name).toBe('string');
			expect(typeof m.website).toBe('string');
			expect(Array.isArray(m.productListingUrls)).toBe(true);
			expect(Array.isArray(m.knownScooterKeys)).toBe(true);
			expect(typeof m.scrapable).toBe('boolean');
			expect(typeof m.country).toBe('string');
			expect(typeof m.tier).toBe('string');
		}
	});

	it('has unique ids', () => {
		const ids = manufacturers.map((m) => m.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});
});

describe('getManufacturer', () => {
	it('finds a manufacturer by id', () => {
		const result = getManufacturer('segway');
		expect(result).toBeDefined();
		expect(result!.id).toBe('segway');
		expect(result!.name).toBe('Segway-Ninebot');
	});

	it('returns undefined for an unknown id', () => {
		const result = getManufacturer('unknown-brand-xyz');
		expect(result).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		const result = getManufacturer('');
		expect(result).toBeUndefined();
	});

	it('finds apollo manufacturer', () => {
		const result = getManufacturer('apollo');
		expect(result).toBeDefined();
		expect(result!.website).toBe('https://apolloscooters.com');
	});

	it('finds xiaomi manufacturer', () => {
		const result = getManufacturer('xiaomi');
		expect(result).toBeDefined();
		expect(result!.country).toBe('China');
	});
});

describe('getManufacturerForScooter', () => {
	it('finds the correct manufacturer for a known scooter key', () => {
		const result = getManufacturerForScooter('segway_gt1');
		expect(result).toBeDefined();
		expect(result!.id).toBe('segway');
	});

	it('finds kaabo manufacturer for wolf_king_gtr', () => {
		const result = getManufacturerForScooter('wolf_king_gtr');
		expect(result).toBeDefined();
		expect(result!.id).toBe('kaabo');
	});

	it('finds emove manufacturer for emove_cruiser_s', () => {
		const result = getManufacturerForScooter('emove_cruiser_s');
		expect(result).toBeDefined();
		expect(result!.id).toBe('emove');
	});

	it('finds gotrax manufacturer for gotrax_g4', () => {
		const result = getManufacturerForScooter('gotrax_g4');
		expect(result).toBeDefined();
		expect(result!.id).toBe('gotrax');
	});

	it('returns undefined for a scooter key not in any manufacturer list', () => {
		const result = getManufacturerForScooter('nonexistent_scooter_9999');
		expect(result).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		const result = getManufacturerForScooter('');
		expect(result).toBeUndefined();
	});
});

describe('getScrapableManufacturers', () => {
	it('returns only manufacturers with scrapable=true', () => {
		const result = getScrapableManufacturers();
		for (const m of result) {
			expect(m.scrapable).toBe(true);
		}
	});

	it('excludes manufacturers with scrapable=false', () => {
		const nonScrapable = manufacturers.filter((m) => !m.scrapable);
		const scrapable = getScrapableManufacturers();
		const scrapableIds = new Set(scrapable.map((m) => m.id));

		for (const m of nonScrapable) {
			expect(scrapableIds.has(m.id)).toBe(false);
		}
	});

	it('returns only manufacturers that have at least one productListingUrl', () => {
		const result = getScrapableManufacturers();
		for (const m of result) {
			expect(m.productListingUrls.length).toBeGreaterThan(0);
		}
	});

	it('returns a non-empty list', () => {
		const result = getScrapableManufacturers();
		expect(result.length).toBeGreaterThan(0);
	});

	it('segway does not appear in scrapable manufacturers (scrapable=false, JS-rendered)', () => {
		const result = getScrapableManufacturers();
		expect(result.some((m) => m.id === 'segway')).toBe(false);
	});

	it('apollo does not appear in scrapable manufacturers (scrapable=false)', () => {
		const result = getScrapableManufacturers();
		expect(result.some((m) => m.id === 'apollo')).toBe(false);
	});

	it('xiaomi does not appear in scrapable manufacturers (scrapable=false)', () => {
		const result = getScrapableManufacturers();
		expect(result.some((m) => m.id === 'xiaomi')).toBe(false);
	});

	it('kaabo appears in scrapable manufacturers (scrapable=true)', () => {
		const result = getScrapableManufacturers();
		expect(result.some((m) => m.id === 'kaabo')).toBe(true);
	});
});
