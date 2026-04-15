import { parse } from 'node-html-parser';
import type { SpecField } from './types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import { throttleGemini, markRateLimited, isGeminiAvailable } from './gemini-limiter';

/**
 * Use Google Gemini Flash to extract scooter specs from raw HTML.
 * Falls back gracefully if no API key is configured.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Maximum text characters to send to the LLM (keep tokens low for free tier) */
const MAX_TEXT_LENGTH = 12000;

/** Extended spec fields the LLM can extract beyond the base SpecField set */
type LLMSpecField = SpecField | 'ampHours' | 'chargeTime' | 'maxRiderWeight';

export interface LLMExtractionResult {
	specs: Partial<Record<LLMSpecField, number>>;
	confidence: 'high' | 'medium' | 'low';
	notes?: string;
}

/**
 * Check if LLM extraction is available (API key configured and not rate-limited)
 */
export function isLLMAvailable(): boolean {
	return isGeminiAvailable(env.GEMINI_API_KEY);
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
		await throttleGemini();

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
				markRateLimited(response.headers.get('retry-after'));
				logger.warn({ url }, 'Gemini rate limited — backing off per retry-after header');
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
	return `You are a precision data extraction assistant for electric scooters. Extract ONLY verified specifications from this product page for the "${scooterName}".

Return a JSON object with ONLY the fields you can confidently extract (omit fields you cannot find with certainty):
- topSpeed: number (km/h — convert mph × 1.609; use the highest stated speed if multiple modes given)
- range: number (km — convert miles × 1.609; use the manufacturer's standard range, not the best-case)
- batteryWh: number (Wh — if given as Ah × V, compute it; e.g. 15Ah × 48V = 720Wh)
- ampHours: number (Ah — raw battery capacity before Wh conversion, if stated)
- price: number (USD — just the digits, no currency symbol; use current/sale price if shown)
- voltage: number (V — rated system voltage, e.g. 36, 48, 52, 60, 72)
- motorWatts: number (W — use rated/continuous watts, not peak unless that's all that's given; for dual motors multiply by 2)
- weight: number (kg — scooter weight without rider; convert lbs × 0.4536)
- wheelSize: number (inches)
- chargeTime: number (hours — time to full charge from empty)
- maxRiderWeight: number (kg — maximum supported rider weight; convert lbs × 0.4536)

Also include:
- confidence: "high" if 5+ specs clearly match the scooter name, "medium" if 2-4 specs found, "low" if fewer than 2
- notes: one sentence describing quality of the data found (optional)

Rules:
- Only extract specs explicitly stated for THIS scooter model — never infer from accessories or comparison products
- If the same field appears multiple times with different values, prefer the value labeled "rated" or "nominal" over "peak"
- All units must be metric — show only the numeric value (no units in the value)
- Numbers must be realistic: speed 5–120 km/h, range 5–200 km, battery 100–10000 Wh, motor 100–20000 W, weight 5–80 kg, wheel 4–20 inches
- Return {} for specs if the page clearly does not contain specs for this scooter

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
		const specs: Partial<Record<LLMSpecField, number>> = {};

		const validFields: LLMSpecField[] = [
			'topSpeed',
			'range',
			'batteryWh',
			'ampHours',
			'price',
			'voltage',
			'motorWatts',
			'weight',
			'wheelSize',
			'chargeTime',
			'maxRiderWeight',
		];

		// Sanity ranges for each field
		const ranges: Record<string, [number, number]> = {
			topSpeed: [5, 200],
			range: [3, 500],
			batteryWh: [100, 10000],
			ampHours: [3, 150],
			price: [50, 25000],
			voltage: [12, 120],
			motorWatts: [100, 20000],
			weight: [3, 100],
			wheelSize: [4, 20],
			chargeTime: [0.5, 24],
			maxRiderWeight: [40, 300],
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
