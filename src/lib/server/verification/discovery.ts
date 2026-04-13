import { parse } from 'node-html-parser';
import { env } from '$env/dynamic/private';
import type { Manufacturer } from './manufacturers';
import { presetMetadata } from '$lib/data/presets';
import { extractProductsFromHTML, fetchPage, type ExtractedProduct } from './html-extractor';

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
	/** How this scooter was discovered */
	extractionMethod?: string;
}

export interface DiscoveryResult {
	manufacturer: Manufacturer;
	scooters: DiscoveredScooter[];
	newScooters: DiscoveredScooter[];
	scannedUrls: string[];
	errors: string[];
	/** URLs that returned errors (for stale URL detection) */
	deadUrls: string[];
	/** Methods used for extraction */
	methods: string[];
	scannedAt: string;
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Discover scooters from a manufacturer using the smart extraction chain:
 * 1. Fetch each URL + check health
 * 2. Extract products with HTML parser (no API needed)
 * 3. Optionally enhance with Gemini LLM for pages where HTML parsing found nothing
 */
export async function discoverScooters(manufacturer: Manufacturer): Promise<DiscoveryResult> {
	const result: DiscoveryResult = {
		manufacturer,
		scooters: [],
		newScooters: [],
		scannedUrls: [],
		errors: [],
		deadUrls: [],
		methods: [],
		scannedAt: new Date().toISOString(),
	};

	for (const listingUrl of manufacturer.productListingUrls) {
		// Step 1: Fetch the page with health check
		const page = await fetchPage(listingUrl);

		if (!page.ok) {
			result.errors.push(`${listingUrl}: ${page.error}`);
			if (page.status === 404 || page.status === 410 || page.status === 0) {
				result.deadUrls.push(listingUrl);
			}
			continue;
		}

		result.scannedUrls.push(listingUrl);

		if (page.html.length < 500) {
			result.errors.push(`${listingUrl}: Page too small (${page.html.length} bytes) — likely JS-rendered`);
			continue;
		}

		// Step 2: Smart HTML extraction (no API needed)
		const extraction = extractProductsFromHTML(page.html, listingUrl);

		if (extraction.products.length > 0) {
			result.methods.push(...extraction.methods);
			for (const product of extraction.products) {
				result.scooters.push(productToScooter(product, manufacturer));
			}
		}

		// Step 3: If HTML extraction found nothing, try Gemini as fallback
		if (extraction.products.length === 0 && env.GEMINI_API_KEY) {
			const llmResult = await extractScootersWithLLM(page.html, manufacturer.name, listingUrl);
			if (llmResult.error) {
				result.errors.push(`${listingUrl}: LLM fallback: ${llmResult.error}`);
			}
			if (llmResult.scooters.length > 0) {
				result.scooters.push(...llmResult.scooters);
				result.methods.push('gemini-llm');
			}
		} else if (extraction.products.length === 0) {
			result.errors.push(`${listingUrl}: No products found via HTML parsing (no API key for LLM fallback)`);
		}

		// Log extraction errors
		for (const err of extraction.errors) {
			result.errors.push(`${listingUrl}: ${err}`);
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

	// Deduplicate methods
	result.methods = [...new Set(result.methods)];

	// Match against existing presets
	const existingKeys = Object.keys(presetMetadata);

	for (const scooter of result.scooters) {
		const nameLower = scooter.name.toLowerCase();

		// Exact match on name
		const exactMatch = existingKeys.find((key) => presetMetadata[key].name.toLowerCase() === nameLower);
		if (exactMatch) {
			scooter.isKnown = true;
			scooter.matchedKey = exactMatch;
			continue;
		}

		// Fuzzy match
		const existingNames = Object.values(presetMetadata).map((p) => p.name.toLowerCase());
		const fuzzyMatch = existingNames.find((existing) => {
			const similarity = computeSimilarity(nameLower, existing);
			return similarity > 0.7;
		});
		if (fuzzyMatch) {
			scooter.isKnown = true;
			scooter.matchedKey = existingKeys.find((key) => presetMetadata[key].name.toLowerCase() === fuzzyMatch);
		}
	}

	result.newScooters = result.scooters.filter((s) => !s.isKnown);
	return result;
}

/**
 * Scan all scrapable manufacturers.
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

/** Convert an ExtractedProduct to a DiscoveredScooter */
function productToScooter(product: ExtractedProduct, manufacturer: Manufacturer): DiscoveredScooter {
	return {
		name: product.name,
		url: product.url,
		manufacturer: manufacturer.name,
		manufacturerId: manufacturer.id,
		specs: {
			price: product.price,
		},
		isKnown: false,
		extractionMethod: product.method,
	};
}

// --- Gemini LLM fallback (used only when HTML parsing fails) ---

interface LLMExtractionResult {
	scooters: DiscoveredScooter[];
	error?: string;
}

/**
 * Use Gemini to extract scooter models from page content.
 * This is the FALLBACK — only called when HTML parsing found 0 products.
 */
async function extractScootersWithLLM(
	html: string,
	manufacturerName: string,
	sourceUrl: string,
	retryCount = 0
): Promise<LLMExtractionResult> {
	// Strip HTML to text for the prompt
	const pageText = stripHtmlForLLM(html, sourceUrl);

	if (pageText.length < 50) {
		return { scooters: [], error: 'Too little text content for LLM extraction' };
	}

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
		const response = await fetch(GEMINI_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': env.GEMINI_API_KEY!,
			},
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
			if (retryCount < 1) {
				const retryAfter = (retryCount + 1) * 15;
				await new Promise((r) => setTimeout(r, retryAfter * 1000));
				return extractScootersWithLLM(html, manufacturerName, sourceUrl, retryCount + 1);
			}
			return { scooters: [], error: 'Gemini rate limit — HTML extraction should be used instead' };
		}

		if (!response.ok) {
			return { scooters: [], error: `Gemini HTTP ${response.status}` };
		}

		const data = await response.json();
		const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!content) {
			return { scooters: [], error: 'Gemini returned empty response' };
		}

		let parsed = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
		if (!Array.isArray(parsed)) parsed = [parsed];

		const scooters = (parsed as Record<string, unknown>[])
			.filter((item) => item.name && typeof item.name === 'string')
			.map(
				(item): DiscoveredScooter => ({
					name: item.name as string,
					url: (item.url as string) || sourceUrl,
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
					extractionMethod: 'gemini-llm',
				})
			);

		return { scooters };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return { scooters: [], error: `LLM extraction failed: ${msg}` };
	}
}

/** Strip HTML to clean text for LLM prompt */
function stripHtmlForLLM(html: string, url: string): string {
	const root = parse(html);

	// Remove noise
	const removeSelectors = [
		'script',
		'style',
		'noscript',
		'iframe',
		'svg',
		'nav',
		'footer',
		'.nav',
		'.footer',
		'.header',
		'.menu',
		'.cookie',
		'.popup',
		'.modal',
		'.newsletter',
		'[role="navigation"]',
	];
	for (const sel of removeSelectors) {
		try {
			root.querySelectorAll(sel).forEach((el) => el.remove());
		} catch {
			/* ignore */
		}
	}

	const text = root.textContent.replace(/\s+/g, ' ').trim();

	// Get product links
	const productLinks: string[] = [];
	try {
		const links = root.querySelectorAll('a[href*="/products/"], a[href*="/product/"]');
		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const linkText = link.textContent.trim();
			if (linkText && href) {
				const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
				productLinks.push(`PRODUCT: ${linkText} -> ${fullUrl}`);
			}
		}
	} catch {
		/* ignore */
	}

	return [
		`SOURCE: ${url}`,
		productLinks.length > 0 ? `\nPRODUCT LINKS:\n${productLinks.join('\n')}` : '',
		`\nPAGE CONTENT:\n${text.slice(0, 15000)}`,
	]
		.filter(Boolean)
		.join('\n');
}

/** Simple string similarity (Jaccard on character bigrams) */
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
