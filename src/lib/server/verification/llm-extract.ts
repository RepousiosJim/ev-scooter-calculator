import { parse } from 'node-html-parser';
import type { SpecField } from './types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';

/**
 * Use Google Gemini Flash to extract scooter specs from raw HTML.
 * Falls back gracefully if no API key is configured.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Maximum text characters to send to the LLM (keep tokens low for free tier) */
const MAX_TEXT_LENGTH = 12000;

/** Back off for 2 minutes after a rate limit hit to avoid wasting requests */
const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000;
let rateLimitedUntil = 0;

interface LLMExtractionResult {
	specs: Partial<Record<SpecField, number>>;
	confidence: 'high' | 'medium' | 'low';
	notes?: string;
}

/**
 * Check if LLM extraction is available (API key configured and not rate-limited)
 */
export function isLLMAvailable(): boolean {
	if (!env.GEMINI_API_KEY) return false;
	if (Date.now() < rateLimitedUntil) return false;
	return true;
}

/**
 * Extract specs from HTML using Gemini.
 * Strips HTML to clean text, then asks the LLM to find specs.
 */
export async function extractWithLLM(html: string, scooterName: string, url: string): Promise<LLMExtractionResult> {
	if (!env.GEMINI_API_KEY) {
		return { specs: {}, confidence: 'low', notes: 'No Gemini API key configured' };
	}

	// Strip HTML to meaningful text content
	const text = htmlToText(html, url);

	if (text.length < 50) {
		return { specs: {}, confidence: 'low', notes: 'Page has too little text content' };
	}

	const prompt = buildPrompt(scooterName, text);

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
					maxOutputTokens: 512,
					responseMimeType: 'application/json',
				},
			}),
			signal: AbortSignal.timeout(15000),
		});

		if (!response.ok) {
			const errText = await response.text();
			if (response.status === 429) {
				rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
				logger.warn({ url }, 'Gemini rate limited — LLM disabled for 2 minutes, using HTML fallback');
				return { specs: {}, confidence: 'low', notes: 'Gemini rate limit — HTML extraction used' };
			}
			logger.error({ status: response.status, body: errText.slice(0, 200) }, 'Gemini API error');
			return { specs: {}, confidence: 'low', notes: 'Extraction service error' };
		}

		const data = await response.json();
		const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!content) {
			return { specs: {}, confidence: 'low', notes: 'Empty response from Gemini' };
		}

		return parseGeminiResponse(content);
	} catch (e) {
		return {
			specs: {},
			confidence: 'low',
			notes: `LLM extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
		};
	}
}

function buildPrompt(scooterName: string, pageText: string): string {
	return `You are a data extraction assistant. Extract electric scooter specifications from this product page text for the "${scooterName}".

Return a JSON object with ONLY these fields (omit any you cannot find):
- topSpeed: number (km/h — convert from mph if needed: multiply by 1.609)
- range: number (km — convert from miles if needed: multiply by 1.609)
- batteryWh: number (Wh — if given in Ah and voltage, calculate: Ah × V)
- price: number (USD — just the number, no currency symbol)
- voltage: number (V)
- motorWatts: number (W — if given in kW, multiply by 1000. Use peak/max wattage if multiple values)
- weight: number (kg — convert from lbs if needed: multiply by 0.4536)
- wheelSize: number (inches)

Also include:
- confidence: "high" if specs clearly match the scooter name, "medium" if partially sure, "low" if uncertain
- notes: brief note about what you found (optional)

Rules:
- Only extract specs that are clearly for this specific scooter, not accessories or other products
- Use the most commonly stated value if multiple values exist
- All units must be metric (km/h, km, kg) — convert imperial values
- Return numbers only, no units in the values
- If the page doesn't contain specs for this scooter, return empty specs with confidence "low"

PAGE TEXT:
${pageText.slice(0, MAX_TEXT_LENGTH)}`;
}

/**
 * Strip HTML to clean, relevant text content.
 * Removes scripts, styles, nav, footer, and other noise.
 */
function htmlToText(html: string, url: string): string {
	const root = parse(html);

	// Remove noisy elements
	const removeSelectors = [
		'script',
		'style',
		'noscript',
		'iframe',
		'svg',
		'path',
		'nav',
		'footer',
		'header:not(.product-header)',
		'.nav',
		'.footer',
		'.header',
		'.menu',
		'.sidebar',
		'.cookie',
		'.popup',
		'.modal',
		'.newsletter',
		'[role="navigation"]',
		'[role="banner"]',
	];

	for (const sel of removeSelectors) {
		try {
			root.querySelectorAll(sel).forEach((el) => el.remove());
		} catch {
			/* selector may not match */
		}
	}

	// Get text content
	let text = root.textContent
		.replace(/\s+/g, ' ')
		.replace(/\n\s*\n/g, '\n')
		.trim();

	// Also extract meta tag data (often has structured product info)
	const metaTags: string[] = [];
	try {
		const metas = parse(html).querySelectorAll('meta[property], meta[name]');
		for (const meta of metas) {
			const prop = meta.getAttribute('property') || meta.getAttribute('name') || '';
			const content = meta.getAttribute('content') || '';
			if (content && (prop.includes('product') || prop.includes('price') || prop.includes('og:'))) {
				metaTags.push(`${prop}: ${content}`);
			}
		}
	} catch {
		/* ignore */
	}

	// Extract JSON-LD structured data
	const jsonLd: string[] = [];
	try {
		const ldScripts = parse(html).querySelectorAll('script[type="application/ld+json"]');
		for (const script of ldScripts) {
			const data = JSON.parse(script.textContent);
			if (data['@type'] === 'Product' || data['@type'] === 'IndividualProduct') {
				jsonLd.push(`STRUCTURED DATA: ${JSON.stringify(data).slice(0, 2000)}`);
			}
		}
	} catch {
		/* ignore */
	}

	const extra = [...metaTags, ...jsonLd].join('\n');
	if (extra) {
		text = `SOURCE: ${url}\n\nMETA/STRUCTURED DATA:\n${extra}\n\nPAGE CONTENT:\n${text}`;
	}

	return text;
}

/**
 * Parse the JSON response from Gemini into our spec format.
 */
function parseGeminiResponse(content: string): LLMExtractionResult {
	try {
		// Clean potential markdown wrapping
		let json = content.trim();
		if (json.startsWith('```')) {
			json = json.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
		}

		const parsed = JSON.parse(json);
		const specs: Partial<Record<SpecField, number>> = {};

		const validFields: SpecField[] = [
			'topSpeed',
			'range',
			'batteryWh',
			'price',
			'voltage',
			'motorWatts',
			'weight',
			'wheelSize',
		];

		// Sanity ranges for each field
		const ranges: Record<string, [number, number]> = {
			topSpeed: [10, 200],
			range: [5, 500],
			batteryWh: [100, 10000],
			price: [50, 20000],
			voltage: [12, 120],
			motorWatts: [100, 20000],
			weight: [5, 100],
			wheelSize: [4, 20],
		};

		for (const field of validFields) {
			const val = parsed[field];
			if (typeof val === 'number' && !isNaN(val) && val > 0) {
				const range = ranges[field];
				if (range && (val < range[0] || val > range[1])) continue;
				specs[field] = Math.round(val * 100) / 100; // 2 decimal places max
			}
		}

		return {
			specs,
			confidence: parsed.confidence || 'medium',
			notes: parsed.notes,
		};
	} catch {
		return { specs: {}, confidence: 'low', notes: 'Failed to parse LLM response' };
	}
}
