import { parse } from 'node-html-parser';
import type { SpecField } from './types';
import { scrapeUrl } from './scraper';

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

export interface SearchAndExtractResult {
	query: string;
	searchResults: SearchResult[];
	extractedSpecs: Partial<Record<SpecField, { value: number; source: string; url: string }[]>>;
	errors: string[];
}

/**
 * Search the web for scooter specs using DuckDuckGo HTML (no API key needed).
 * Then scrape the top results to extract specs.
 */
export async function searchAndExtractSpecs(
	scooterName: string,
	scooterKey: string
): Promise<SearchAndExtractResult> {
	const query = `${scooterName} electric scooter specifications price battery range`;
	const result: SearchAndExtractResult = {
		query,
		searchResults: [],
		extractedSpecs: {},
		errors: []
	};

	// Step 1: Search using DuckDuckGo HTML lite
	try {
		const searchResults = await searchDuckDuckGo(query);
		result.searchResults = searchResults;
	} catch (e) {
		result.errors.push(`Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
	}

	// Fall back to common retailer URLs when search returns nothing
	if (result.searchResults.length === 0) {
		result.searchResults = generateFallbackUrls(scooterName);
	}

	if (result.searchResults.length === 0) {
		result.errors.push('No search results found');
		return result;
	}

	// Step 2: Scrape top 3 results to extract specs
	const urlsToScrape = result.searchResults
		.slice(0, 3)
		.filter((r) => isScooterRelevantUrl(r.url));

	for (const searchResult of urlsToScrape) {
		try {
			const scrapeResult = await scrapeUrl(scooterKey, searchResult.url);
			if (scrapeResult.success) {
				for (const [field, value] of Object.entries(scrapeResult.extractedSpecs)) {
					if (!result.extractedSpecs[field as SpecField]) {
						result.extractedSpecs[field as SpecField] = [];
					}
					result.extractedSpecs[field as SpecField]!.push({
						value: value as number,
						source: searchResult.title || new URL(searchResult.url).hostname,
						url: searchResult.url
					});
				}
			}
		} catch (e) {
			result.errors.push(
				`Scrape failed for ${searchResult.url}: ${e instanceof Error ? e.message : 'Unknown'}`
			);
		}
	}

	return result;
}

/**
 * Search DuckDuckGo HTML lite for results.
 * Uses the lite version which returns HTML that can be parsed without JS rendering.
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
	const encodedQuery = encodeURIComponent(query);
	const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

	const response = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'text/html',
			'Accept-Language': 'en-US,en;q=0.5'
		},
		signal: AbortSignal.timeout(10000)
	});

	if (!response.ok) {
		throw new Error(`DuckDuckGo returned ${response.status}`);
	}

	const html = await response.text();
	const root = parse(html);
	const results: SearchResult[] = [];

	// DuckDuckGo lite returns results in a table structure
	const links = root.querySelectorAll('a.result-link, td a[href^="http"]');
	for (const link of links) {
		const href = link.getAttribute('href');
		if (!href || href.includes('duckduckgo.com')) continue;

		const title = link.textContent.trim();
		if (!title) continue;

		// Get the snippet from the next row
		const parentTr = link.closest('tr');
		const snippetTd = parentTr?.nextElementSibling?.querySelector('td.result-snippet');
		const snippet = snippetTd?.textContent?.trim() || '';

		results.push({ title, url: href, snippet });
	}

	// Also try the standard results format
	if (results.length === 0) {
		const resultDivs = root.querySelectorAll('.result, .web-result');
		for (const div of resultDivs) {
			const linkEl = div.querySelector('a[href^="http"]');
			const snippetEl = div.querySelector('.result__snippet, .result-snippet');
			if (linkEl) {
				const href = linkEl.getAttribute('href');
				if (href && !href.includes('duckduckgo.com')) {
					results.push({
						title: linkEl.textContent.trim(),
						url: href,
						snippet: snippetEl?.textContent?.trim() || ''
					});
				}
			}
		}
	}

	return results.slice(0, 10);
}

/**
 * Generate fallback URLs from common scooter retailers when search fails.
 */
function generateFallbackUrls(scooterName: string): SearchResult[] {
	const slug = scooterName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const retailers = [
		{ name: 'Electric Scooter Guide', base: `https://electric-scooter.guide/reviews/${slug}-review/` },
		{ name: 'RevRides', base: `https://revrides.com/products/${slug}` },
		{ name: 'Voro Motors', base: `https://www.voromotors.com/products/${slug}` },
		{ name: 'FluidFreeRide', base: `https://fluidfreeride.com/products/${slug}` },
	];

	return retailers.map((r) => ({
		title: `${scooterName} - ${r.name}`,
		url: r.base,
		snippet: `Check ${r.name} for ${scooterName} specs and pricing`
	}));
}

/**
 * Filter out URLs that are unlikely to have scooter specs.
 */
function isScooterRelevantUrl(url: string): boolean {
	const irrelevantDomains = [
		'youtube.com',
		'facebook.com',
		'twitter.com',
		'instagram.com',
		'reddit.com',
		'tiktok.com',
		'pinterest.com',
		'wikipedia.org'
	];

	try {
		const hostname = new URL(url).hostname.toLowerCase();
		return !irrelevantDomains.some((d) => hostname.includes(d));
	} catch {
		return false;
	}
}
