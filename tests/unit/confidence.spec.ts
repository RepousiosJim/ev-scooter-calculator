import { describe, it, expect } from 'vitest';
import { computeConfidence, computeOverallConfidence } from '$lib/server/verification/confidence';
import type { SourceEntry } from '$lib/server/verification/types';

/** Helper to create a mock SourceEntry with sensible defaults and optional overrides. */
function makeSource(overrides: Partial<SourceEntry> = {}): SourceEntry {
	return {
		id: overrides.id ?? 'src-1',
		type: overrides.type ?? 'manufacturer',
		name: overrides.name ?? 'Test Source',
		url: overrides.url ?? 'https://example.com',
		value: overrides.value ?? 50,
		unit: overrides.unit ?? 'km/h',
		fetchedAt: overrides.fetchedAt ?? new Date().toISOString(),
		addedBy: overrides.addedBy ?? 'manual',
		notes: overrides.notes,
	};
}

/** Create N sources with the same value and type, fetched recently. */
function makeAgreeSources(count: number, value = 50, type: SourceEntry['type'] = 'manufacturer'): SourceEntry[] {
	return Array.from({ length: count }, (_, i) => makeSource({ id: `src-${i}`, value, type }));
}

describe('computeConfidence', () => {
	describe('empty sources', () => {
		it('returns 0 for an empty sources array', () => {
			expect(computeConfidence([])).toBe(0);
		});
	});

	describe('single source', () => {
		it('gives a reasonable confidence score', () => {
			// count=10, agreement=40 (default for single), diversity=2 (one type), recency~10 (fresh)
			const result = computeConfidence([makeSource()]);
			// Expected ~62 (10+40+2+10), but recency depends on exact timing
			expect(result).toBeGreaterThanOrEqual(60);
			expect(result).toBeLessThanOrEqual(62);
		});
	});

	describe('source count scoring', () => {
		it('increases score with more sources (same type, same value)', () => {
			const one = computeConfidence(makeAgreeSources(1));
			const two = computeConfidence(makeAgreeSources(2));
			const three = computeConfidence(makeAgreeSources(3));
			expect(two).toBeGreaterThan(one);
			expect(three).toBeGreaterThan(two);
		});

		it('caps count score at 40 (4+ sources)', () => {
			const four = computeConfidence(makeAgreeSources(4));
			const six = computeConfidence(makeAgreeSources(6));
			// Both have count=40, agreement=40, diversity=2, recency~10 => ~92
			// The scores should be equal since count is capped at 40
			expect(four).toBe(six);
		});
	});

	describe('agreement scoring', () => {
		it('gives full agreement score when sources report identical values', () => {
			const sources = makeAgreeSources(3, 50);
			const result = computeConfidence(sources);
			// count=30, agreement=40, diversity=2, recency~10 => ~82
			expect(result).toBeGreaterThanOrEqual(80);
		});

		it('gives lower agreement score when sources diverge significantly', () => {
			const agreeing = [
				makeSource({ id: 'a', value: 50 }),
				makeSource({ id: 'b', value: 50 }),
				makeSource({ id: 'c', value: 50 }),
			];
			const divergent = [
				makeSource({ id: 'a', value: 30 }),
				makeSource({ id: 'b', value: 50 }),
				makeSource({ id: 'c', value: 80 }),
			];
			const agreeResult = computeConfidence(agreeing);
			const divergeResult = computeConfidence(divergent);
			expect(agreeResult).toBeGreaterThan(divergeResult);
		});

		it('gives zero agreement score for wildly divergent values', () => {
			// CV of 0.20 or above should give ~0 agreement
			// values: 10, 100 => mean=55, stddev~45, CV~0.82 => agreement = 0
			const sources = [makeSource({ id: 'a', value: 10 }), makeSource({ id: 'b', value: 100 })];
			const result = computeConfidence(sources);
			// count=20, agreement~0, diversity=2, recency~10 => ~32
			expect(result).toBeLessThanOrEqual(35);
		});
	});

	describe('diversity scoring', () => {
		it('gives lower diversity score for a single source type', () => {
			const singleType = [
				makeSource({ id: 'a', type: 'manufacturer', value: 50 }),
				makeSource({ id: 'b', type: 'manufacturer', value: 50 }),
			];
			const twoTypes = [
				makeSource({ id: 'a', type: 'manufacturer', value: 50 }),
				makeSource({ id: 'b', type: 'retailer', value: 50 }),
			];
			const singleResult = computeConfidence(singleType);
			const twoResult = computeConfidence(twoTypes);
			expect(twoResult).toBeGreaterThan(singleResult);
		});

		it('gives maximum diversity score for 3+ different source types', () => {
			const threeTypes = [
				makeSource({ id: 'a', type: 'manufacturer', value: 50 }),
				makeSource({ id: 'b', type: 'retailer', value: 50 }),
				makeSource({ id: 'c', type: 'review', value: 50 }),
			];
			const twoTypes = [
				makeSource({ id: 'a', type: 'manufacturer', value: 50 }),
				makeSource({ id: 'b', type: 'retailer', value: 50 }),
				makeSource({ id: 'c', type: 'retailer', value: 50 }),
			];
			const threeResult = computeConfidence(threeTypes);
			const twoResult = computeConfidence(twoTypes);
			// 3 types = diversity 10 vs 2 types = diversity 5, so a difference of 5
			expect(threeResult - twoResult).toBe(5);
		});
	});

	describe('recency scoring', () => {
		it('gives full recency score for recently fetched sources', () => {
			const source = makeSource({ fetchedAt: new Date().toISOString() });
			const result = computeConfidence([source]);
			// count=10, agreement=40, diversity=2, recency~10
			expect(result).toBeGreaterThanOrEqual(61);
		});

		it('gives lower recency score for sources older than 1 year', () => {
			const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
			const oldSource = makeSource({ fetchedAt: twoYearsAgo });
			const freshSource = makeSource({ fetchedAt: new Date().toISOString() });

			const oldResult = computeConfidence([oldSource]);
			const freshResult = computeConfidence([freshSource]);
			expect(freshResult).toBeGreaterThan(oldResult);
		});

		it('gives zero recency score for very old sources (>1 year)', () => {
			const veryOld = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
			const source = makeSource({ fetchedAt: veryOld });
			const result = computeConfidence([source]);
			// count=10, agreement=40, diversity=2, recency=0 => 52
			expect(result).toBe(52);
		});

		it('uses the most recent source for recency calculation', () => {
			const old = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
			const fresh = new Date().toISOString();
			const sources = [
				makeSource({ id: 'a', fetchedAt: old, value: 50 }),
				makeSource({ id: 'b', fetchedAt: fresh, value: 50 }),
			];
			const result = computeConfidence(sources);
			// Recency should be based on the fresh source, not the old one
			// count=20, agreement=40, diversity=2, recency~10 => ~72
			expect(result).toBeGreaterThanOrEqual(70);
		});
	});

	describe('score bounds', () => {
		it('never exceeds 100', () => {
			// 5 agreeing sources from 4 different types, all fresh
			const sources = [
				makeSource({ id: 'a', type: 'manufacturer', value: 50 }),
				makeSource({ id: 'b', type: 'retailer', value: 50 }),
				makeSource({ id: 'c', type: 'review', value: 50 }),
				makeSource({ id: 'd', type: 'community', value: 50 }),
				makeSource({ id: 'e', type: 'scrape', value: 50 }),
			];
			const result = computeConfidence(sources);
			// count=40, agreement=40, diversity=10, recency~10 => ~100
			expect(result).toBeLessThanOrEqual(100);
		});

		it('achieves maximum score of 100 with ideal inputs', () => {
			// 4+ sources, same value, 3+ types, fresh data
			const sources = [
				makeSource({ id: 'a', type: 'manufacturer', value: 50 }),
				makeSource({ id: 'b', type: 'retailer', value: 50 }),
				makeSource({ id: 'c', type: 'review', value: 50 }),
				makeSource({ id: 'd', type: 'community', value: 50 }),
			];
			const result = computeConfidence(sources);
			expect(result).toBe(100);
		});

		it('never goes below 0', () => {
			const veryOld = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
			const sources = [
				makeSource({ id: 'a', value: 1, fetchedAt: veryOld }),
				makeSource({ id: 'b', value: 1000, fetchedAt: veryOld }),
			];
			const result = computeConfidence(sources);
			expect(result).toBeGreaterThanOrEqual(0);
		});
	});
});

describe('computeOverallConfidence', () => {
	it('returns 0 for an empty fields object', () => {
		expect(computeOverallConfidence({})).toBe(0);
	});

	it('returns 0 when all fields have empty sources', () => {
		const fields = {
			topSpeed: { confidence: 0, sources: [] },
			range: { confidence: 0, sources: [] },
		};
		expect(computeOverallConfidence(fields)).toBe(0);
	});

	it('returns the confidence of a single field with sources', () => {
		const fields = {
			topSpeed: { confidence: 85, sources: [makeSource()] },
		};
		expect(computeOverallConfidence(fields)).toBe(85);
	});

	it('averages confidence across fields that have sources', () => {
		const fields = {
			topSpeed: { confidence: 80, sources: [makeSource({ id: 'a' })] },
			range: { confidence: 60, sources: [makeSource({ id: 'b' })] },
		};
		expect(computeOverallConfidence(fields)).toBe(70);
	});

	it('ignores fields with no sources when averaging', () => {
		const fields = {
			topSpeed: { confidence: 80, sources: [makeSource({ id: 'a' })] },
			range: { confidence: 0, sources: [] },
			weight: { confidence: 60, sources: [makeSource({ id: 'b' })] },
		};
		// Only topSpeed (80) and weight (60) should count => average = 70
		expect(computeOverallConfidence(fields)).toBe(70);
	});

	it('rounds the average to the nearest integer', () => {
		const fields = {
			topSpeed: { confidence: 81, sources: [makeSource({ id: 'a' })] },
			range: { confidence: 60, sources: [makeSource({ id: 'b' })] },
			weight: { confidence: 73, sources: [makeSource({ id: 'c' })] },
		};
		// (81 + 60 + 73) / 3 = 71.333... => 71
		expect(computeOverallConfidence(fields)).toBe(71);
	});
});
