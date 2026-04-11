import { parse } from 'node-html-parser';
import { env } from '$env/dynamic/private';
import type { Manufacturer } from './manufacturers';
import { presetMetadata } from '$lib/data/presets';

export interface DiscoveredScooter {
	name: string;
	url: string;
	manufacturer: string;
	manufacturerId: string;
	/** Extracted specs if available */
	specs: {
		topSpeed?: number;
		range?: number;
		batteryWh?: number;
		price?: number;
		motorWatts?: number;
		weight?: number;
	};
	/** Whether this scooter is already in our system */
	isKnown: boolean;
	/** If known, which key it maps to */
	matchedKey?: string;
	/** Year if detectable */
	year?: number;
}

export interface DiscoveryResult {
	manufacturer: Manufacturer;
	scooters: DiscoveredScooter[];
	newScooters: DiscoveredScooter[];
	scannedUrls: string[];
	errors: string[];
	scannedAt: string;
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Scan a manufacturer's product listing pages to discover scooter models.
 * Uses Gemini to extract product names and basic specs from listing pages.
 */
export async function discoverScooters(manufacturer: Manufacturer): Promise<DiscoveryResult> {
	const result: DiscoveryResult = {
		manufacturer,
		scooters: [],
		newScooters: [],
		scannedUrls: [],
		errors: [],
		scannedAt: new Date().toISOString(),
	};

	if (!env.GEMINI_API_KEY) {
		result.errors.push('No Gemini API key configured');
		return result;
	}

	// Fetch each product listing URL
	for (const listingUrl of manufacturer.productListingUrls) {
		try {
			const response = await fetch(listingUrl, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: 'text/html',
				},
				signal: AbortSignal.timeout(15000),
			});

			if (!response.ok) {
				result.errors.push(`${listingUrl}: HTTP ${response.status}`);
				continue;
			}

			const html = await response.text();
			result.scannedUrls.push(listingUrl);

			// Extract product listing text
			const pageText = extractListingText(html, listingUrl);

			if (pageText.length < 50) {
				result.errors.push(`${listingUrl}: Page has too little content (likely JS-rendered)`);
				continue;
			}

			// Ask Gemini to extract scooter models from the listing
			const llmResult = await extractScootersWithLLM(pageText, manufacturer.name, listingUrl);
			if (llmResult.error) {
				result.errors.push(`${listingUrl}: ${llmResult.error}`);
			}
			result.scooters.push(...llmResult.scooters);
		} catch (e) {
			result.errors.push(`${listingUrl}: ${e instanceof Error ? e.message : 'Unknown error'}`);
		}
	}

	// Deduplicate by name (case-insensitive)
	const seen = new Set<string>();
	result.scooters = result.scooters.filter((s) => {
		const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	// Match against existing presets
	const existingNames = Object.values(presetMetadata).map((p) => p.name.toLowerCase());
	const existingKeys = Object.keys(presetMetadata);

	for (const scooter of result.scooters) {
		const nameLower = scooter.name.toLowerCase();
		// Try exact match first
		const exactMatch = existingKeys.find(
			(key) => presetMetadata[key].name.toLowerCase() === nameLower
		);
		if (exactMatch) {
			scooter.isKnown = true;
			scooter.matchedKey = exactMatch;
			continue;
		}

		// Fuzzy match — check if names are very similar
		const fuzzyMatch = existingNames.find((existing) => {
			const similarity = computeSimilarity(nameLower, existing);
			return similarity > 0.7;
		});
		if (fuzzyMatch) {
			scooter.isKnown = true;
			scooter.matchedKey = existingKeys.find(
				(key) => presetMetadata[key].name.toLowerCase() === fuzzyMatch
			);
		}
	}

	result.newScooters = result.scooters.filter((s) => !s.isKnown);
	return result;
}

/**
 * Scan all scrapable manufacturers for new scooters.
 */
export async function discoverAll(
	scrapableManufacturers: Manufacturer[],
	onProgress?: (manufacturer: string, index: number, total: number) => void
): Promise<DiscoveryResult[]> {
	const results: DiscoveryResult[] = [];

	for (let i = 0; i < scrapableManufacturers.length; i++) {
		const mfr = scrapableManufacturers[i];
		onProgress?.(mfr.name, i, scrapableManufacturers.length);
		const result = await discoverScooters(mfr);
		results.push(result);
	}

	return results;
}

/**
 * Strip HTML to clean text focused on product listing content.
 */
function extractListingText(html: string, url: string): string {
	const root = parse(html);

	// Remove noise
	const removeSelectors = [
		'script', 'style', 'noscript', 'iframe', 'svg',
		'nav', 'footer', '.nav', '.footer', '.header', '.menu',
		'.cookie', '.popup', '.modal', '.newsletter',
		'[role="navigation"]',
	];
	for (const sel of removeSelectors) {
		try {
			root.querySelectorAll(sel).forEach((el) => el.remove());
		} catch { /* ignore */ }
	}

	let text = root.textContent.replace(/\s+/g, ' ').trim();

	// Also get product links
	const productLinks: string[] = [];
	try {
		const links = root.querySelectorAll('a[href*="/products/"], a[href*="/product/"], a[href*="/collections/"]');
		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const linkText = link.textContent.trim();
			if (linkText && href) {
				const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
				productLinks.push(`PRODUCT LINK: ${linkText} -> ${fullUrl}`);
			}
		}
	} catch { /* ignore */ }

	// Get meta tags for structured data
	const metaInfo: string[] = [];
	try {
		const jsonLd = root.querySelectorAll('script[type="application/ld+json"]');
		for (const script of jsonLd) {
			try {
				const data = JSON.parse(script.textContent);
				if (data['@type'] === 'ItemList' || data['@type'] === 'CollectionPage' || Array.isArray(data)) {
					metaInfo.push(`STRUCTURED DATA: ${JSON.stringify(data).slice(0, 3000)}`);
				}
			} catch { /* ignore */ }
		}
	} catch { /* ignore */ }

	return [
		`SOURCE: ${url}`,
		...metaInfo,
		productLinks.length > 0 ? `\nPRODUCT LINKS:\n${productLinks.join('\n')}` : '',
		`\nPAGE CONTENT:\n${text.slice(0, 15000)}`,
	].filter(Boolean).join('\n');
}

interface LLMExtractionResult {
	scooters: DiscoveredScooter[];
	error?: string;
}

/**
 * Use Gemini to extract scooter models from a product listing page.
 * Includes retry logic for rate limits.
 */
async function extractScootersWithLLM(
	pageText: string,
	manufacturerName: string,
	sourceUrl: string,
	retryCount = 0,
): Promise<LLMExtractionResult> {
	const prompt = `You are analyzing an electric scooter product listing page from "${manufacturerName}".

Extract ALL electric scooter models listed on this page. For each scooter, provide:
- name: The full model name (e.g. "EMOVE Cruiser S", "Kaabo Wolf King GTR Pro")
- url: The product page URL if visible in links (full URL)
- price: Price in USD if shown (number only)
- topSpeed: Top speed in km/h if shown (convert from mph: multiply by 1.609)
- range: Range in km if shown (convert from miles: multiply by 1.609)
- batteryWh: Battery capacity in Wh if shown
- motorWatts: Motor power in watts if shown
- weight: Weight in kg if shown (convert from lbs: multiply by 0.4536)
- year: Model year if detectable

Return a JSON array of objects. Only include electric scooters (kick scooters), not bikes, motorcycles, or accessories.
If no scooters are found, return an empty array [].

PAGE CONTENT:
${pageText.slice(0, 15000)}`;

	try {
		const response = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0.1,
					maxOutputTokens: 2048,
					responseMimeType: 'application/json',
				},
			}),
			signal: AbortSignal.timeout(30000),
		});

		if (response.status === 429) {
			if (retryCount < 2) {
				const retryAfter = Math.min(60, (retryCount + 1) * 20);
				// Rate limited — wait and retry
				await new Promise((r) => setTimeout(r, retryAfter * 1000));
				return extractScootersWithLLM(pageText, manufacturerName, sourceUrl, retryCount + 1);
			}
			return { scooters: [], error: 'Gemini API rate limit exceeded. Try again later.' };
		}

		if (!response.ok) {
			return { scooters: [], error: `Gemini API error: HTTP ${response.status}` };
		}

		const data = await response.json();
		const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!content) {
			return { scooters: [], error: 'Gemini returned empty response' };
		}

		let parsed = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
		if (!Array.isArray(parsed)) parsed = [parsed];

		const scooters = parsed
			.filter((item: any) => item.name && typeof item.name === 'string')
			.map((item: any) => ({
				name: item.name,
				url: item.url || sourceUrl,
				manufacturer: manufacturerName,
				manufacturerId: '',
				specs: {
					topSpeed: typeof item.topSpeed === 'number' ? item.topSpeed : undefined,
					range: typeof item.range === 'number' ? item.range : undefined,
					batteryWh: typeof item.batteryWh === 'number' ? item.batteryWh : undefined,
					price: typeof item.price === 'number' ? item.price : undefined,
					motorWatts: typeof item.motorWatts === 'number' ? item.motorWatts : undefined,
					weight: typeof item.weight === 'number' ? item.weight : undefined,
				},
				isKnown: false,
				year: typeof item.year === 'number' ? item.year : undefined,
			}));

		return { scooters };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return { scooters: [], error: `LLM extraction failed: ${msg}` };
	}
}

/**
 * Simple string similarity (Jaccard on character bigrams)
 */
function computeSimilarity(a: string, b: string): number {
	const bigramsA = new Set<string>();
	const bigramsB = new Set<string>();
	for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
	for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

	let intersection = 0;
	for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;

	const union = bigramsA.size + bigramsB.size - intersection;
	return union === 0 ? 0 : intersection / union;
}
