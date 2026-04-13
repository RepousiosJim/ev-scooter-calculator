/**
 * Unit tests for src/lib/server/verification/auto-verify.ts
 *
 * All I/O dependencies (scraper, known-sources, store) are mocked so no
 * actual network or disk activity occurs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AutoVerifyProgress } from '$lib/server/verification/auto-verify';

// ---------------------------------------------------------------------------
// Mock dependencies — use vi.hoisted so refs are defined before vi.mock runs
// ---------------------------------------------------------------------------

const { mockScrapeUrl, mockGetKnownSources, mockGetStore, mockBatchAddSources } = vi.hoisted(() => {
	return {
		mockScrapeUrl: vi.fn(),
		mockGetKnownSources: vi.fn(),
		mockGetStore: vi.fn(),
		mockBatchAddSources: vi.fn(),
	};
});

vi.mock('$lib/server/verification/scraper', () => ({
	scrapeUrl: mockScrapeUrl,
}));

vi.mock('$lib/server/verification/known-sources', () => ({
	getKnownSources: mockGetKnownSources,
	knownSources: { ninebot_max_g2: {}, xiaomi_pro2: {} },
}));

vi.mock('$lib/server/verification/store', () => ({
	getStore: mockGetStore,
	batchAddSources: mockBatchAddSources,
}));

import { autoVerifyScooter, autoVerifyAll } from '$lib/server/verification/auto-verify';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSource(name: string, url: string) {
	return { name, url, type: 'manufacturer' as const };
}

function makeStore(existingData?: object) {
	return {
		get: vi.fn().mockResolvedValue(existingData ?? null),
	};
}

// Reset all mocks before every test so call counts don't bleed across tests
beforeEach(() => {
	mockScrapeUrl.mockReset();
	mockGetKnownSources.mockReset();
	mockGetStore.mockReset();
	mockBatchAddSources.mockReset();
});

// ---------------------------------------------------------------------------
// autoVerifyScooter – no sources
// ---------------------------------------------------------------------------

describe('autoVerifyScooter – no known sources', () => {
	beforeEach(() => {
		mockGetKnownSources.mockResolvedValue([]);
		mockGetStore.mockResolvedValue(makeStore());
	});

	it('returns progress with totalSources=0 when no sources exist', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.totalSources).toBe(0);
	});

	it('returns 0 succeeded/failed when no sources exist', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.succeeded).toBe(0);
		expect(progress.failed).toBe(0);
	});

	it('returns the correct scooterKey', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.scooterKey).toBe('ninebot_max');
	});
});

// ---------------------------------------------------------------------------
// autoVerifyScooter – successful scrape
// ---------------------------------------------------------------------------

describe('autoVerifyScooter – successful scrape', () => {
	beforeEach(() => {
		mockGetKnownSources.mockResolvedValue([makeSource('Segway Official', 'https://segway.com/ninebot-max')]);
		mockGetStore.mockResolvedValue(makeStore());
		mockScrapeUrl.mockResolvedValue({
			success: true,
			extractedSpecs: { topSpeed: 30, range: 40 },
		});
		mockBatchAddSources.mockResolvedValue(undefined);
	});

	it('marks progress.succeeded=1 when scrape returns specs', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.succeeded).toBe(1);
		expect(progress.failed).toBe(0);
	});

	it('sets specsFound correctly on the result', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.results[0].specsFound).toBe(2);
	});

	it('sets result.success=true', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.results[0].success).toBe(true);
	});

	it('calls batchAddSources once for the source with all spec fields', async () => {
		await autoVerifyScooter('ninebot_max');
		// One batchAddSources call per source URL (contains topSpeed + range)
		expect(mockBatchAddSources).toHaveBeenCalledTimes(1);
		const [, , entries] = mockBatchAddSources.mock.calls[0] as [unknown, unknown, Array<{ field: string }>];
		expect(entries.map((e) => e.field).sort()).toEqual(['range', 'topSpeed'].sort());
	});

	it('calls the onSourceDone callback after each source', async () => {
		const cb = vi.fn();
		await autoVerifyScooter('ninebot_max', cb);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('passes result and progress snapshot to onSourceDone', async () => {
		const cb = vi.fn();
		await autoVerifyScooter('ninebot_max', cb);
		const [result, progress] = cb.mock.calls[0] as [unknown, AutoVerifyProgress];
		expect((result as { success: boolean }).success).toBe(true);
		expect(progress.completed).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// autoVerifyScooter – failed scrape (no specs)
// ---------------------------------------------------------------------------

describe('autoVerifyScooter – scrape returns no specs', () => {
	beforeEach(() => {
		mockGetKnownSources.mockResolvedValue([makeSource('Unknown Site', 'https://example.com/scooter')]);
		mockGetStore.mockResolvedValue(makeStore());
		mockScrapeUrl.mockResolvedValue({
			success: false,
			extractedSpecs: {},
			error: 'Could not parse page',
		});
	});

	it('increments failed counter', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.failed).toBe(1);
		expect(progress.succeeded).toBe(0);
	});

	it('sets result.error from scrape result', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.results[0].error).toBe('Could not parse page');
	});
});

// ---------------------------------------------------------------------------
// autoVerifyScooter – scrape throws an exception
// ---------------------------------------------------------------------------

describe('autoVerifyScooter – scrape throws', () => {
	beforeEach(() => {
		mockGetKnownSources.mockResolvedValue([makeSource('Broken Site', 'https://broken.example.com')]);
		mockGetStore.mockResolvedValue(makeStore());
		mockScrapeUrl.mockRejectedValue(new Error('Connection timeout'));
	});

	it('catches the error and increments failed counter', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.failed).toBe(1);
	});

	it('stores the error message on the result', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.results[0].error).toBe('Connection timeout');
	});
});

// ---------------------------------------------------------------------------
// autoVerifyScooter – skips recently-fetched URLs
// ---------------------------------------------------------------------------

describe('autoVerifyScooter – skips recently-fetched URL', () => {
	beforeEach(() => {
		const url = 'https://segway.com/ninebot-max';
		// Build an existing store that has this URL fetched just now
		const existingStore = {
			scooterKey: 'ninebot_max',
			fields: {
				topSpeed: {
					sources: [
						{
							url,
							fetchedAt: new Date().toISOString(), // within last 24 h
						},
					],
				},
			},
		};

		mockGetKnownSources.mockResolvedValue([makeSource('Segway Official', url)]);
		mockGetStore.mockResolvedValue({ get: vi.fn().mockResolvedValue(existingStore) });
		mockScrapeUrl.mockResolvedValue({ success: true, extractedSpecs: { topSpeed: 30 } });
	});

	it('does not call scrapeUrl for a recently-fetched URL', async () => {
		await autoVerifyScooter('ninebot_max');
		expect(mockScrapeUrl).not.toHaveBeenCalled();
	});

	it('still marks the result as success with skip message', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.results[0].success).toBe(true);
		expect(progress.results[0].error).toMatch(/24 hours/);
	});
});

// ---------------------------------------------------------------------------
// autoVerifyScooter – success=true but empty extractedSpecs
// ---------------------------------------------------------------------------

describe('autoVerifyScooter – scrape success but empty specs', () => {
	beforeEach(() => {
		mockGetKnownSources.mockResolvedValue([makeSource('Empty Site', 'https://empty.example.com')]);
		mockGetStore.mockResolvedValue(makeStore());
		mockScrapeUrl.mockResolvedValue({
			success: true,
			extractedSpecs: {},
		});
	});

	it('counts as failed when no specs are extracted despite success=true', async () => {
		const progress = await autoVerifyScooter('ninebot_max');
		expect(progress.failed).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// autoVerifyAll
// ---------------------------------------------------------------------------

describe('autoVerifyAll', () => {
	beforeEach(() => {
		// knownSources mock has 2 keys: ninebot_max_g2, xiaomi_pro2
		mockGetKnownSources.mockResolvedValue([]);
		mockGetStore.mockResolvedValue(makeStore());
	});

	it('returns a record with one entry per scooter key from knownSources', async () => {
		const results = await autoVerifyAll();
		expect(Object.keys(results).length).toBeGreaterThan(0);
	});

	it('calls onProgress for each scooter key', async () => {
		const cb = vi.fn();
		await autoVerifyAll(cb);
		expect(cb).toHaveBeenCalled();
	});

	it('passes index and total to onProgress', async () => {
		const calls: [string, number, number][] = [];
		await autoVerifyAll((key, index, total) => {
			calls.push([key, index, total]);
		});
		expect(calls.length).toBeGreaterThan(0);
		// All totals should be the same (number of known sources)
		const total = calls[0][2];
		expect(calls.every(([, , t]) => t === total)).toBe(true);
	});
});
