import { parse } from 'node-html-parser';
import type { SpecField, ScrapeResult } from './types';
import { getScraperRules, type ScrapeRuleset } from './scraper-rules';
import { extractWithLLM, isLLMAvailable } from './llm-extract';
import { presetMetadata } from '$lib/data/presets';

/**
 * Scrape a product page URL and extract scooter specs.
 * Uses LLM (Gemini) as primary extraction, with regex/CSS fallback.
 */
export async function scrapeUrl(scooterKey: string, url: string): Promise<ScrapeResult> {
	const result: ScrapeResult = {
		scooterKey,
		source: new URL(url).hostname,
		url,
		extractedSpecs: {},
		scrapedAt: new Date().toISOString(),
		success: false
	};

	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5'
			},
			signal: AbortSignal.timeout(15000)
		});

		if (!response.ok) {
			result.error = `HTTP ${response.status}: ${response.statusText}`;
			return result;
		}

		const html = await response.text();

		// Strategy 1: LLM extraction (Gemini) — best results, handles any format
		if (isLLMAvailable()) {
			const scooterName = presetMetadata[scooterKey]?.name || scooterKey;
			const llmResult = await extractWithLLM(html, scooterName, url);

			if (Object.keys(llmResult.specs).length > 0) {
				result.extractedSpecs = llmResult.specs;
				result.success = true;
				return result;
			}
		}

		// Strategy 2: Rule-based CSS selectors (for known site structures)
		const root = parse(html);
		const rules = getScraperRules(url);
		if (rules) {
			result.extractedSpecs = extractWithRules(root, rules);
		}

		// Strategy 3: Generic regex patterns (broad fallback)
		if (Object.keys(result.extractedSpecs).length < 2) {
			const genericSpecs = extractGeneric(html, root);
			result.extractedSpecs = { ...genericSpecs, ...result.extractedSpecs };
		}

		result.success = Object.keys(result.extractedSpecs).length > 0;
		if (!result.success) {
			result.error =
				'Could not extract specs. The page may use JavaScript rendering or have an unrecognized layout.';
		}
	} catch (e) {
		result.error = e instanceof Error ? e.message : 'Unknown error';
	}

	return result;
}

function extractWithRules(
	root: ReturnType<typeof parse>,
	rules: ScrapeRuleset
): Partial<Record<SpecField, number>> {
	const specs: Partial<Record<SpecField, number>> = {};

	for (const [field, selector] of Object.entries(rules.selectors)) {
		try {
			const element = root.querySelector(selector.cssSelector);
			if (!element) continue;

			const text = element.textContent.trim();
			let value: number | undefined;

			if (selector.regex) {
				const match = text.match(new RegExp(selector.regex, 'i'));
				if (match?.[1]) {
					value = parseFloat(match[1].replace(/,/g, ''));
				}
			} else if (selector.transform) {
				value = selector.transform(text);
			} else {
				const numMatch = text.match(/[\d,]+(?:\.\d+)?/);
				if (numMatch) {
					value = parseFloat(numMatch[0].replace(/,/g, ''));
				}
			}

			if (value !== undefined && !isNaN(value) && value > 0) {
				specs[field as SpecField] = value;
			}
		} catch {
			// Skip this field on error
		}
	}

	return specs;
}

/**
 * Generic extraction using common patterns found on scooter product pages.
 * Looks for spec tables, labeled values, and structured data.
 */
/** Convert mph to km/h */
function mphToKmh(mph: number): number {
	return Math.round(mph * 1.60934);
}

/** Convert miles to km */
function milesToKm(miles: number): number {
	return Math.round(miles * 1.60934);
}

/** Convert lbs to kg */
function lbsToKg(lbs: number): number {
	return Math.round(lbs * 0.453592 * 10) / 10;
}

interface SpecPattern {
	field: SpecField;
	regex: RegExp;
	/** If matched unit is imperial, apply conversion */
	convert?: (value: number) => number;
}

function extractGeneric(
	html: string,
	root: ReturnType<typeof parse>
): Partial<Record<SpecField, number>> {
	const specs: Partial<Record<SpecField, number>> = {};

	// Patterns grouped by field. Order matters: metric patterns first, then imperial with conversion.
	const patterns: SpecPattern[] = [
		// Top Speed - metric
		{ field: 'topSpeed', regex: /(?:top|max(?:imum)?)\s*speed[:\s]*(\d+(?:\.\d+)?)\s*(?:km\/h|kph)/i },
		{ field: 'topSpeed', regex: /(\d+(?:\.\d+)?)\s*(?:km\/h|kph)\s*(?:top|max)/i },
		{ field: 'topSpeed', regex: /speed[:\s]*(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*(?:km\/h|kph)/i },
		// Top Speed - imperial (convert mph → km/h)
		{ field: 'topSpeed', regex: /(?:top|max(?:imum)?)\s*speed[:\s]*(\d+(?:\.\d+)?)\s*mph/i, convert: mphToKmh },
		{ field: 'topSpeed', regex: /(\d+(?:\.\d+)?)\s*mph\s*(?:top|max)/i, convert: mphToKmh },
		{ field: 'topSpeed', regex: /speed[:\s]*(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*mph/i, convert: mphToKmh },

		// Range - metric
		{ field: 'range', regex: /(?:max(?:imum)?|est(?:imated)?)\s*range[:\s]*(\d+(?:\.\d+)?)\s*km/i },
		{ field: 'range', regex: /range[:\s]*(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*km/i },
		{ field: 'range', regex: /(\d+(?:\.\d+)?)\s*km\s*range/i },
		// Range - imperial (convert miles → km)
		{ field: 'range', regex: /(?:max(?:imum)?|est(?:imated)?)\s*range[:\s]*(\d+(?:\.\d+)?)\s*mi(?:les?)?/i, convert: milesToKm },
		{ field: 'range', regex: /range[:\s]*(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*mi(?:les?)?/i, convert: milesToKm },
		{ field: 'range', regex: /(\d+(?:\.\d+)?)\s*mi(?:les?)?\s*range/i, convert: milesToKm },

		// Battery Wh
		{ field: 'batteryWh', regex: /battery[:\s]*(\d+(?:\.\d+)?)\s*wh/i },
		{ field: 'batteryWh', regex: /(\d+(?:\.\d+)?)\s*wh\s*(?:battery|lithium|capacity)/i },
		{ field: 'batteryWh', regex: /capacity[:\s]*(\d+(?:\.\d+)?)\s*wh/i },
		{ field: 'batteryWh', regex: /(\d{3,5})\s*wh\b/i },

		// Price
		{ field: 'price', regex: /\$\s*([\d,]+(?:\.\d{2})?)/ },
		{ field: 'price', regex: /(?:price|cost|msrp)[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i },
		{ field: 'price', regex: /USD\s*([\d,]+(?:\.\d{2})?)/i },
		{ field: 'price', regex: /"price"\s*:\s*"?([\d,.]+)"?/i },

		// Voltage
		{ field: 'voltage', regex: /(?:battery\s*)?voltage[:\s]*(\d+(?:\.\d+)?)\s*v\b/i },
		{ field: 'voltage', regex: /(\d+)\s*v\s*(?:battery|lithium|nominal)/i },

		// Motor watts
		{ field: 'motorWatts', regex: /(?:motor|power)[:\s]*(\d[\d,]*(?:\.\d+)?)\s*w(?:att)?s?\b/i },
		{ field: 'motorWatts', regex: /([\d,]+)\s*w(?:att)?s?\s*(?:motor|dual|single|peak|rated|nominal)/i },
		{ field: 'motorWatts', regex: /(?:peak|rated|nominal)\s*(?:power)?[:\s]*([\d,]+)\s*w\b/i },

		// Weight - metric
		{ field: 'weight', regex: /(?:net\s*)?weight[:\s]*(\d+(?:\.\d+)?)\s*kg/i },
		{ field: 'weight', regex: /(\d+(?:\.\d+)?)\s*kg\s*(?:net\s*)?(?:weight)?/i },
		// Weight - imperial (convert lbs → kg)
		{ field: 'weight', regex: /(?:net\s*)?weight[:\s]*(\d+(?:\.\d+)?)\s*lbs?/i, convert: lbsToKg },
		{ field: 'weight', regex: /(\d+(?:\.\d+)?)\s*lbs?\s*(?:net\s*)?(?:weight)?/i, convert: lbsToKg },

		// Wheel size
		{ field: 'wheelSize', regex: /(?:wheel|tire)\s*(?:size)?[:\s]*(\d+(?:\.\d+)?)\s*(?:inch|in(?:ch)?|")/i },
		{ field: 'wheelSize', regex: /(\d+(?:\.\d+)?)\s*(?:inch|in(?:ch)?|")\s*(?:wheel|tire)/i },
	];

	// Sanity check ranges per field
	const sanityRanges: Partial<Record<SpecField, [number, number]>> = {
		topSpeed: [10, 200],
		range: [5, 500],
		batteryWh: [100, 10000],
		price: [50, 20000],
		voltage: [12, 120],
		weight: [5, 100],
		motorWatts: [100, 20000],
		wheelSize: [4, 20],
	};

	for (const { field, regex, convert } of patterns) {
		if (specs[field]) continue; // Already found

		const match = html.match(regex);
		if (match?.[1]) {
			let value = parseFloat(match[1].replace(/,/g, ''));
			if (isNaN(value) || value <= 0) continue;

			if (convert) value = convert(value);

			const range = sanityRanges[field];
			if (range && (value < range[0] || value > range[1])) continue;

			specs[field] = value;
		}
	}

	// Try JSON-LD structured data
	try {
		const ldScripts = root.querySelectorAll('script[type="application/ld+json"]');
		for (const script of ldScripts) {
			const data = JSON.parse(script.textContent);
			if (data['@type'] === 'Product' && data.offers) {
				const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
				if (offer?.price && !specs.price) {
					specs.price = parseFloat(offer.price);
				}
			}
			if (data['@type'] === 'Product' && data.weight && !specs.weight) {
				const w = parseFloat(data.weight.value || data.weight);
				if (!isNaN(w) && w > 0) {
					const unit = (data.weight.unitCode || data.weight.unitText || '').toLowerCase();
					specs.weight = unit.includes('lb') ? lbsToKg(w) : w;
				}
			}
		}
	} catch {
		// JSON-LD parsing failed, that's fine
	}

	// Try meta tags (some Shopify sites put price in meta)
	if (!specs.price) {
		try {
			const priceMeta = root.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]');
			if (priceMeta) {
				const p = parseFloat(priceMeta.getAttribute('content') || '');
				if (!isNaN(p) && p > 50 && p < 20000) specs.price = p;
			}
		} catch { /* ignore */ }
	}

	return specs;
}
