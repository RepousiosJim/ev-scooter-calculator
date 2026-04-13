/**
 * Unit tests for src/lib/server/verification/known-sources.ts
 *
 * getKnownSourceStats is tested against the real knownSources object.
 * getKnownSources is tested with a mocked dynamic import of pipeline-actions.
 *
 * Because getKnownSources uses a lazy dynamic import('./pipeline-actions') we
 * must use vi.resetModules() + vi.doMock() per describe block to control
 * whether the import succeeds or fails.
 *
 * Note: vi.doMock path must match the module specifier as resolved by vitest.
 * The source file does `import('./pipeline-actions')` which resolves to
 * `$lib/server/verification/pipeline-actions` via SvelteKit aliases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KnownSource } from '$lib/server/verification/known-sources';

// ---------------------------------------------------------------------------
// getKnownSourceStats — uses real knownSources, no mocking needed
// ---------------------------------------------------------------------------

describe('getKnownSourceStats', () => {
	let getKnownSourceStats: () => { total: number; withSources: number; totalUrls: number };

	beforeEach(async () => {
		vi.resetModules();
		const mod = await import('$lib/server/verification/known-sources');
		getKnownSourceStats = mod.getKnownSourceStats;
	});

	it('returns an object with total, withSources, totalUrls fields', () => {
		const stats = getKnownSourceStats();
		expect(stats).toHaveProperty('total');
		expect(stats).toHaveProperty('withSources');
		expect(stats).toHaveProperty('totalUrls');
	});

	it('total equals the number of keys in knownSources (> 0)', () => {
		const stats = getKnownSourceStats();
		expect(stats.total).toBeGreaterThan(0);
	});

	it('withSources is less than or equal to total', () => {
		const stats = getKnownSourceStats();
		expect(stats.withSources).toBeLessThanOrEqual(stats.total);
		expect(stats.withSources).toBeGreaterThanOrEqual(0);
	});

	it('totalUrls is >= withSources (at least one URL per "with sources" scooter)', () => {
		const stats = getKnownSourceStats();
		expect(stats.totalUrls).toBeGreaterThanOrEqual(stats.withSources);
	});

	it('scooters with empty source arrays are NOT counted in withSources', () => {
		const stats = getKnownSourceStats();
		// The real data has some empty arrays (e.g. inmotion_rs, apollo_go)
		// So withSources should be strictly less than total
		expect(stats.withSources).toBeLessThan(stats.total);
	});
});

// ---------------------------------------------------------------------------
// getKnownSources — pipeline import returns empty array
// ---------------------------------------------------------------------------

describe('getKnownSources – pipeline returns empty', () => {
	it('returns static sources when pipeline returns empty array for that key', async () => {
		vi.resetModules();
		vi.doMock('$lib/server/verification/pipeline-actions', () => ({
			getDynamicSources: vi.fn().mockReturnValue([]),
		}));
		const mod = await import('$lib/server/verification/known-sources');
		const sources = await mod.getKnownSources('emove_roadster');
		expect(Array.isArray(sources)).toBe(true);
		expect(sources.length).toBeGreaterThanOrEqual(1);
	});

	it('returns empty array when both static and dynamic are empty', async () => {
		vi.resetModules();
		vi.doMock('$lib/server/verification/pipeline-actions', () => ({
			getDynamicSources: vi.fn().mockReturnValue([]),
		}));
		const mod = await import('$lib/server/verification/known-sources');
		// 'inmotion_rs' has an empty static array
		const sources = await mod.getKnownSources('inmotion_rs');
		expect(sources).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getKnownSources — pipeline import fails
// ---------------------------------------------------------------------------

describe('getKnownSources – pipeline import fails', () => {
	it('falls back to static sources when pipeline-actions import throws', async () => {
		vi.resetModules();
		vi.doMock('$lib/server/verification/pipeline-actions', () => {
			throw new Error('circular dependency');
		});
		const mod = await import('$lib/server/verification/known-sources');
		const sources = await mod.getKnownSources('emove_roadster');
		expect(Array.isArray(sources)).toBe(true);
		expect(sources.length).toBeGreaterThanOrEqual(1);
		expect(sources[0].name).toBe('Voro Motors (Official)');
	});

	it('returns empty array for a key with no static sources when import throws', async () => {
		vi.resetModules();
		vi.doMock('$lib/server/verification/pipeline-actions', () => {
			throw new Error('circular dependency');
		});
		const mod = await import('$lib/server/verification/known-sources');
		// 'inmotion_rs' has an empty static array
		const sources = await mod.getKnownSources('inmotion_rs');
		expect(sources).toEqual([]);
	});

	it('returns empty array for a completely unknown scooter key', async () => {
		vi.resetModules();
		vi.doMock('$lib/server/verification/pipeline-actions', () => {
			throw new Error('circular dependency');
		});
		const mod = await import('$lib/server/verification/known-sources');
		const sources = await mod.getKnownSources('totally_unknown_scooter_xyz');
		expect(sources).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getKnownSources — merge and deduplication
// ---------------------------------------------------------------------------

describe('getKnownSources – deduplication', () => {
	it('deduplicates dynamic sources that share a URL with a static source', async () => {
		vi.resetModules();

		vi.doMock('$lib/server/verification/pipeline-actions', () => ({
			getDynamicSources: vi.fn().mockReturnValue([
				{
					name: 'Duplicate',
					type: 'retailer' as const,
					url: 'https://www.voromotors.com/products/emove-roadster', // same as static
				},
			]),
		}));

		const mod = await import('$lib/server/verification/known-sources');
		const sources = await mod.getKnownSources('emove_roadster');

		// Should not have duplicate URLs
		const urls = sources.map((s) => s.url);
		const unique = new Set(urls);
		expect(unique.size).toBe(urls.length);
	});

	it('adds unique dynamic sources that have different URLs', async () => {
		vi.resetModules();

		const newDynamic: KnownSource = {
			name: 'New Review Site',
			type: 'review',
			url: 'https://new-review-site.com/emove-roadster',
		};

		vi.doMock('$lib/server/verification/pipeline-actions', () => ({
			getDynamicSources: vi.fn().mockReturnValue([newDynamic]),
		}));

		const mod = await import('$lib/server/verification/known-sources');
		const sources = await mod.getKnownSources('emove_roadster');

		const urls = sources.map((s) => s.url);
		expect(urls).toContain('https://new-review-site.com/emove-roadster');
		// And still has the original static source
		expect(urls).toContain('https://www.voromotors.com/products/emove-roadster');
	});
});
