import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks (must be declared before the import under test)
// ---------------------------------------------------------------------------

vi.mock('$lib/server/verification/scraper', () => ({
	scrapeUrl: vi.fn(),
}));

// node-html-parser is a real dependency; stub it so tests don't touch the
// network and can inject any HTML structure we like.
vi.mock('node-html-parser', () => ({
	parse: vi.fn(),
}));

import { searchAndExtractSpecs } from '$lib/server/verification/web-search';
import { scrapeUrl } from '$lib/server/verification/scraper';
import { parse } from 'node-html-parser';

// ---------------------------------------------------------------------------
// Typed references to the mocks
// ---------------------------------------------------------------------------
const mockScrapeUrl = vi.mocked(scrapeUrl);
const mockParse = vi.mocked(parse);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal node-html-parser root that returns no results (empty page). */
function emptyRoot() {
	return {
		querySelectorAll: vi.fn().mockReturnValue([]),
	} as unknown as ReturnType<typeof parse>;
}

/** Build a fake ScrapeResult with the given specs. */
function makeScrapeResult(specs: Record<string, number>, success = true, url = 'https://example.com/scooter') {
	return {
		scooterKey: 'test-scooter',
		source: 'example.com',
		url,
		extractedSpecs: specs,
		scrapedAt: new Date().toISOString(),
		success,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searchAndExtractSpecs – return shape', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		// Default: fetch succeeds with an empty DuckDuckGo page
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(emptyRoot());
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({}));
	});

	it('always returns the four expected top-level keys', async () => {
		const result = await searchAndExtractSpecs('Ninebot Max', 'ninebot-max');

		expect(result).toHaveProperty('query');
		expect(result).toHaveProperty('searchResults');
		expect(result).toHaveProperty('extractedSpecs');
		expect(result).toHaveProperty('errors');
	});

	it('builds the query string from scooterName', async () => {
		const result = await searchAndExtractSpecs('Apollo City Pro', 'apollo-city-pro');

		expect(result.query).toContain('Apollo City Pro');
		expect(result.query).toContain('specifications');
	});

	it('searchResults and errors are always arrays', async () => {
		const result = await searchAndExtractSpecs('Kaabo Wolf Warrior', 'kaabo-wolf');

		expect(Array.isArray(result.searchResults)).toBe(true);
		expect(Array.isArray(result.errors)).toBe(true);
	});
});

describe('searchAndExtractSpecs – DuckDuckGo search parsing', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({}));
	});

	it('populates searchResults from parsed anchor tags', async () => {
		// Simulate a DuckDuckGo lite page with one result link
		const fakeLink = {
			getAttribute: (attr: string) => (attr === 'href' ? 'https://electric-scooter.guide/reviews/ninebot-max' : null),
			textContent: 'Ninebot Max Review',
			closest: () => ({
				nextElementSibling: {
					querySelector: () => ({ textContent: 'Great scooter with 40km range.' }),
				},
			}),
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((selector: string) => {
				if (selector === 'a.result-link, td a[href^="http"]') return [fakeLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html>fake ddg html</html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);

		const result = await searchAndExtractSpecs('Ninebot Max', 'ninebot-max');

		expect(result.searchResults.length).toBeGreaterThanOrEqual(1);
		const hit = result.searchResults[0];
		expect(hit.title).toBe('Ninebot Max Review');
		expect(hit.url).toBe('https://electric-scooter.guide/reviews/ninebot-max');
	});

	it('filters out duckduckgo.com links from results', async () => {
		const ddgLink = {
			getAttribute: () => 'https://duckduckgo.com/?q=ninebot',
			textContent: 'DuckDuckGo search',
			closest: () => null,
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((selector: string) => {
				if (selector === 'a.result-link, td a[href^="http"]') return [ddgLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);

		const result = await searchAndExtractSpecs('Ninebot Max', 'ninebot-max');

		const ddgHits = result.searchResults.filter((r) => r.url.includes('duckduckgo.com'));
		expect(ddgHits).toHaveLength(0);
	});
});

describe('searchAndExtractSpecs – fallback URLs', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({}));
	});

	it('falls back to retailer URLs when DuckDuckGo returns no results', async () => {
		// DuckDuckGo fetch fails entirely
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

		const result = await searchAndExtractSpecs('Apollo Ghost', 'apollo-ghost');

		// Should have fallback results (4 retailers) even though search failed
		expect(result.searchResults.length).toBeGreaterThan(0);
		expect(result.errors.some((e) => e.includes('Search failed'))).toBe(true);
	});

	it('fallback URLs are derived from the scooter name slug', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'));
		mockParse.mockReturnValue(emptyRoot());

		const result = await searchAndExtractSpecs('Ninebot Max G30', 'ninebot-max-g30');

		// All fallback URLs should contain the slugified name
		const urls = result.searchResults.map((r) => r.url);
		expect(urls.some((u) => u.includes('ninebot-max-g30'))).toBe(true);
	});

	it('includes a non-empty title and snippet for each fallback result', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('err'));
		mockParse.mockReturnValue(emptyRoot());

		const result = await searchAndExtractSpecs('Dualtron Thunder', 'dualtron-thunder');

		for (const r of result.searchResults) {
			expect(r.title.length).toBeGreaterThan(0);
			expect(r.snippet.length).toBeGreaterThan(0);
		}
	});
});

describe('searchAndExtractSpecs – spec extraction', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('merges scraped specs into extractedSpecs keyed by SpecField', async () => {
		// Provide a real link so the URL passes isScooterRelevantUrl
		const fakeLink = {
			getAttribute: (attr: string) => (attr === 'href' ? 'https://electric-scooter.guide/reviews/wolf' : null),
			textContent: 'Wolf Warrior Review',
			closest: () => ({
				nextElementSibling: {
					querySelector: () => ({ textContent: 'Best scooter.' }),
				},
			}),
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((sel: string) => {
				if (sel === 'a.result-link, td a[href^="http"]') return [fakeLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);
		mockScrapeUrl.mockResolvedValue(
			makeScrapeResult(
				{ topSpeed: 80, range: 150, batteryWh: 2160 },
				true,
				'https://electric-scooter.guide/reviews/wolf'
			)
		);

		const result = await searchAndExtractSpecs('Kaabo Wolf Warrior', 'wolf-warrior');

		expect(result.extractedSpecs.topSpeed).toBeDefined();
		expect(result.extractedSpecs.topSpeed![0].value).toBe(80);
		expect(result.extractedSpecs.range![0].value).toBe(150);
	});

	it('records the source title and url on each extracted spec entry', async () => {
		const fakeLink = {
			getAttribute: (attr: string) => (attr === 'href' ? 'https://revrides.com/products/wolf' : null),
			textContent: 'RevRides Wolf',
			closest: () => ({
				nextElementSibling: { querySelector: () => null },
			}),
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((sel: string) => {
				if (sel === 'a.result-link, td a[href^="http"]') return [fakeLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({ price: 3295 }, true, 'https://revrides.com/products/wolf'));

		const result = await searchAndExtractSpecs('Wolf Warrior', 'wolf-warrior');

		const priceEntry = result.extractedSpecs.price?.[0];
		expect(priceEntry?.source).toBe('RevRides Wolf');
		expect(priceEntry?.url).toBe('https://revrides.com/products/wolf');
	});

	it('skips unsuccessful scrape results', async () => {
		const fakeLink = {
			getAttribute: (attr: string) => (attr === 'href' ? 'https://revrides.com/products/something' : null),
			textContent: 'RevRides',
			closest: () => ({ nextElementSibling: null }),
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((sel: string) => {
				if (sel === 'a.result-link, td a[href^="http"]') return [fakeLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({}, false));

		const result = await searchAndExtractSpecs('Some Scooter', 'some-scooter');

		expect(Object.keys(result.extractedSpecs)).toHaveLength(0);
	});
});

describe('searchAndExtractSpecs – URL filtering (isScooterRelevantUrl)', () => {
	const irrelevantUrls = [
		'https://www.youtube.com/watch?v=abc',
		'https://www.reddit.com/r/ElectricScooters/comments/abc',
		'https://twitter.com/someuser/status/123',
		'https://www.facebook.com/scooters',
		'https://www.instagram.com/p/abc',
	];

	it.each(irrelevantUrls)('does not scrape social/video URL: %s', async (badUrl) => {
		vi.restoreAllMocks();
		// Clear call history on the persisted module mock so each iteration starts fresh
		mockScrapeUrl.mockClear();
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({ topSpeed: 50 }));

		const fakeLink = {
			getAttribute: (attr: string) => (attr === 'href' ? badUrl : null),
			textContent: 'Social Media Post',
			closest: () => ({ nextElementSibling: null }),
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((sel: string) => {
				if (sel === 'a.result-link, td a[href^="http"]') return [fakeLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);

		await searchAndExtractSpecs('Test Scooter', 'test-scooter');

		// scrapeUrl must NOT have been called for irrelevant domains
		expect(mockScrapeUrl).not.toHaveBeenCalled();
	});
});

describe('searchAndExtractSpecs – error handling', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('records a scrape error but still returns a result object', async () => {
		const fakeLink = {
			getAttribute: (attr: string) => (attr === 'href' ? 'https://electric-scooter.guide/reviews/boom' : null),
			textContent: 'Boom Scooter',
			closest: () => ({ nextElementSibling: null }),
		};
		const fakeRoot = {
			querySelectorAll: vi.fn((sel: string) => {
				if (sel === 'a.result-link, td a[href^="http"]') return [fakeLink];
				return [];
			}),
		} as unknown as ReturnType<typeof parse>;

		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '<html></html>',
		} as unknown as Response);
		mockParse.mockReturnValue(fakeRoot);
		mockScrapeUrl.mockRejectedValue(new Error('Connection refused'));

		const result = await searchAndExtractSpecs('Boom Scooter', 'boom-scooter');

		expect(result.errors.some((e) => e.includes('Scrape failed'))).toBe(true);
		expect(result).toHaveProperty('query');
	});

	it('returns errors array with message when DuckDuckGo responds with non-ok status', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			status: 429,
			text: async () => '',
		} as unknown as Response);
		mockParse.mockReturnValue(emptyRoot());
		mockScrapeUrl.mockResolvedValue(makeScrapeResult({}));

		const result = await searchAndExtractSpecs('Some Scooter', 'some-scooter');

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]).toMatch(/Search failed/i);
	});
});
