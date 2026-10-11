import { describe, it, expect } from 'vitest';
import { presets, presetMetadata } from '$lib/data/presets';
import { presetAliases, resolvePresetKey, canonicalPresetPath } from '$lib/data/preset-aliases';

describe('preset aliases', () => {
	it('point from retired keys to keys that exist', () => {
		for (const [from, to] of Object.entries(presetAliases)) {
			expect(presets[from], `${from} should be retired`).toBeUndefined();
			expect(presets[to], `${from} → ${to}`).toBeDefined();
			expect(presetMetadata[to], `${from} → ${to}`).toBeDefined();
		}
	});

	it('resolves retired keys and passes others through', () => {
		expect(resolvePresetKey('compact')).toBe('dualtron_compact');
		expect(resolvePresetKey('navee_gt3')).toBe('navee_gt3');
		expect(resolvePresetKey('toString')).toBe('toString');
	});

	it('redirects scooter pages for retired keys only', () => {
		expect(canonicalPresetPath('/scooter/apollo_city_5')).toBe('/scooter/apollo_city_2_0');
		expect(canonicalPresetPath('/scooter/apollo_city_5/')).toBe('/scooter/apollo_city_2_0');
		expect(canonicalPresetPath('/scooter/navee_gt3')).toBeNull();
		expect(canonicalPresetPath('/rankings')).toBeNull();
	});

	it('redirects comparisons to the canonical, sorted pair', () => {
		expect(canonicalPresetPath('/compare/m365-pro-2-vs-navee-gt3')).toBe('/compare/navee-gt3-vs-xiaomi-pro-2');
		expect(canonicalPresetPath('/compare/navee-gt3-vs-segway-gt1')).toBeNull();
		// Both sides merged into the same scooter: nothing sensible to redirect to.
		expect(canonicalPresetPath('/compare/levy-electric-plus-vs-levy-plus')).toBeNull();
	});
});

describe('catalog integrity', () => {
	it('has no two presets with the same display name', () => {
		const seen = new Map<string, string>();
		for (const [key, meta] of Object.entries(presetMetadata)) {
			const name = meta.name.toLowerCase();
			expect(seen.get(name), `${key} duplicates ${seen.get(name)}`).toBeUndefined();
			seen.set(name, key);
		}
	});
});
