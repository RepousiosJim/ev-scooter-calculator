import { describe, it, expect } from 'vitest';
import { extractCoreModel, areModelsEquivalent } from '$lib/server/verification/model-normalizer';

describe('extractCoreModel', () => {
	it('strips marketing suffix "electric scooter"', () => {
		expect(extractCoreModel('Hiboy S2 Pro Electric Scooter')).toBe('s2_pro');
	});

	it('strips manufacturer prefix when provided', () => {
		expect(extractCoreModel('isinwheel GT2 Electric Scooter', 'isinwheel')).toBe('gt2');
	});

	it('strips known manufacturer prefix without explicit id', () => {
		expect(extractCoreModel('Segway GT2 Electric Scooter')).toBe('gt2');
	});

	it('lowercases output', () => {
		expect(extractCoreModel('Apollo City Pro')).toBe('city_pro');
	});

	it('converts spaces and punctuation to underscores', () => {
		expect(extractCoreModel('Zero 10X')).toBe('10x');
	});

	it('handles "for adults" suffix', () => {
		expect(extractCoreModel('Gotrax G4 Electric Scooter for Adults')).toBe('g4');
	});

	it('strips stacked suffixes', () => {
		// "foldable electric scooter" — both should be stripped
		expect(extractCoreModel('Razor E300 Foldable Electric Scooter')).toBe('e300');
	});

	it('normalizes + to "plus"', () => {
		// "+" should become "plus" in the normalized form
		const result = extractCoreModel('Segway Ninebot F+');
		expect(result).toBe('ninebot_f_plus');
	});

	it('returns empty string for pure marketing text', () => {
		const result = extractCoreModel('Electric Scooter for Adults');
		expect(result).toBe('');
	});

	it('handles model names without manufacturer prefix', () => {
		expect(extractCoreModel('GT Pro Max')).toBe('gt_pro_max');
	});

	it('strips leading/trailing underscores from result', () => {
		const result = extractCoreModel('Xiaomi Mi 3 Lite');
		expect(result).not.toMatch(/^_|_$/);
	});

	it('collapses consecutive underscores', () => {
		const result = extractCoreModel('Some  Model--Name');
		expect(result).not.toContain('__');
	});

	it('uses cache for repeated calls', () => {
		const first = extractCoreModel('Hiboy S2 Pro Electric Scooter');
		const second = extractCoreModel('Hiboy S2 Pro Electric Scooter');
		expect(first).toBe(second);
	});

	it('respects manufacturer hint to strip prefix', () => {
		const withHint = extractCoreModel('Apollo Phantom V3', 'apollo');
		const withoutHint = extractCoreModel('Apollo Phantom V3');
		// Both should strip "apollo", just via different paths
		expect(withHint).toBe(withoutHint);
	});
});

describe('areModelsEquivalent', () => {
	it('returns true for identical names', () => {
		expect(areModelsEquivalent('Hiboy S2 Pro', 'Hiboy S2 Pro')).toBe(true);
	});

	it('returns true when marketing suffix differs', () => {
		expect(areModelsEquivalent('Hiboy S2 Pro', 'Hiboy S2 Pro Electric Scooter')).toBe(true);
	});

	it('returns true for case-insensitive match', () => {
		expect(areModelsEquivalent('HIBOY S2 PRO', 'hiboy s2 pro electric scooter')).toBe(true);
	});

	it('returns false for clearly different models', () => {
		expect(areModelsEquivalent('Segway GT2', 'Xiaomi Mi 4')).toBe(false);
	});

	it('returns true when core is a substring of the other', () => {
		// 's2_pro' is in 'hiboy_s2_pro' (substring logic)
		expect(areModelsEquivalent('S2 Pro', 'Hiboy S2 Pro Electric Scooter')).toBe(true);
	});

	it('returns false for short different names that could falsely match', () => {
		// Very short cores (< 4 chars) should not trigger substring match
		expect(areModelsEquivalent('X2', 'G2 Pro Max Dual Motor Electric Scooter')).toBe(false);
	});

	it('returns true for near-identical names via bigram similarity', () => {
		// These normalize to almost the same string
		expect(areModelsEquivalent('Kaabo Mantis Pro', 'Kaabo Mantis Pro Electric Scooter')).toBe(true);
	});

	it('returns true for manufacturer-prefixed vs prefix-stripped versions', () => {
		expect(areModelsEquivalent('Segway Ninebot F40', 'Ninebot F40', 'segway')).toBe(true);
	});

	it('is symmetric', () => {
		const a = 'Gotrax GXL V2';
		const b = 'Gotrax GXL V2 Electric Scooter for Adults';
		expect(areModelsEquivalent(a, b)).toBe(areModelsEquivalent(b, a));
	});
});
