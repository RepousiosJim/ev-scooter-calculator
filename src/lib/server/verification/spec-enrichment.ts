/**
 * Spec enrichment module.
 * Fetches product detail pages and extracts specs (voltage, battery, motor,
 * speed, range, weight, wheel size) that listing pages don't provide.
 */
import type { PresetCandidate, SpecsQuality } from './preset-generator';
import { assessSpecsQuality } from './preset-generator';
import { fetchPage as fetchPageHttp } from './html-extractor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentResult {
	success: boolean;
	specsFound: Partial<ExtractedSpecs>;
	specsQuality: SpecsQuality;
	strategies: string[];
	errors?: string[];
}

export interface BatchEnrichmentResult {
	total: number;
	enriched: number;
	stillStub: number;
	errors: string[];
	results: Map<string, EnrichmentResult>;
}

interface ExtractedSpecs {
	topSpeed: number;
	range: number;
	batteryWh: number;
	motorWatts: number;
	voltage: number;
	ampHours: number;
	weight: number;
	wheelSize: number;
	price: number;
	chargeTime: number;
	maxRiderWeight: number;
	hillGrade: number;
}

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

function mphToKmh(mph: number): number {
	return Math.round(mph * 1.60934 * 10) / 10;
}
function milesToKm(mi: number): number {
	return Math.round(mi * 1.60934 * 10) / 10;
}
function lbsToKg(lbs: number): number {
	return Math.round(lbs * 0.453592 * 10) / 10;
}

// ---------------------------------------------------------------------------
// Spec parsing helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags from a string */
function stripTags(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Parse a number from text, handling commas */
function parseNum(s: string): number {
	return parseFloat(s.replace(/,/g, ''));
}

/** Validate a parsed spec value is within a sane range */
function validateSpec(field: string, value: number): boolean {
	const ranges: Record<string, [number, number]> = {
		topSpeed: [5, 150],
		range: [3, 200],
		batteryWh: [100, 10000],
		motorWatts: [100, 20000],
		voltage: [24, 100],
		ampHours: [3, 100],
		weight: [5, 80],
		wheelSize: [5, 16],
		price: [100, 15000],
		chargeTime: [0.5, 24],
		maxRiderWeight: [40, 200],
		hillGrade: [5, 60],
	};
	const r = ranges[field];
	if (!r) return true;
	return value >= r[0] && value <= r[1];
}

// ---------------------------------------------------------------------------
// Strategy A: JSON-LD structured data
// ---------------------------------------------------------------------------

function extractFromJsonLd(html: string): Partial<ExtractedSpecs> {
	const specs: Partial<ExtractedSpecs> = {};
	const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
	let match;

	while ((match = jsonLdRegex.exec(html)) !== null) {
		try {
			let data = JSON.parse(match[1]);
			if (data['@graph']) data = data['@graph'];
			const items = Array.isArray(data) ? data : [data];

			for (const item of items) {
				if (item['@type'] !== 'Product') continue;

				// Price from offers
				if (item.offers) {
					const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
					for (const offer of offers) {
						const p = parseFloat(offer.price);
						if (p && validateSpec('price', p)) {
							specs.price = p;
							break;
						}
					}
				}

				// Weight from product attributes
				if (item.weight) {
					const w = typeof item.weight === 'object' ? parseFloat(item.weight.value) : parseFloat(item.weight);
					if (w) {
						const unit = item.weight?.unitText || item.weight?.unitCode || '';
						const kg = /lb|pound/i.test(unit) ? lbsToKg(w) : w;
						if (validateSpec('weight', kg)) specs.weight = kg;
					}
				}

				// Parse specs from description
				const desc = item.description || '';
				if (desc) {
					Object.assign(specs, parseSpecsFromText(stripTags(desc)));
				}
			}
		} catch {
			// Invalid JSON-LD, skip
		}
	}

	return specs;
}

// ---------------------------------------------------------------------------
// Strategy B: Spec table extraction
// ---------------------------------------------------------------------------

function extractFromSpecTables(html: string): Partial<ExtractedSpecs> {
	const specs: Partial<ExtractedSpecs> = {};

	// Match <tr><td>Label</td><td>Value</td></tr> patterns
	const trRegex = /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
	let match;
	while ((match = trRegex.exec(html)) !== null) {
		const label = stripTags(match[1]).toLowerCase();
		const value = stripTags(match[2]);
		parseSpecPair(label, value, specs);
	}

	// Match <dt>Label</dt><dd>Value</dd> patterns
	const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
	while ((match = dlRegex.exec(html)) !== null) {
		const label = stripTags(match[1]).toLowerCase();
		const value = stripTags(match[2]);
		parseSpecPair(label, value, specs);
	}

	return specs;
}

// ---------------------------------------------------------------------------
// Strategy C: Spec div/list patterns
// ---------------------------------------------------------------------------

function extractFromSpecSections(html: string): Partial<ExtractedSpecs> {
	const specs: Partial<ExtractedSpecs> = {};

	// Find sections with spec-like class names
	const sectionRegex =
		/<(?:div|section|ul|ol)[^>]*class\s*=\s*["'][^"']*(?:spec|feature|detail|product-info|tech|param)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|ul|ol)>/gi;
	let match;
	while ((match = sectionRegex.exec(html)) !== null) {
		const section = match[1];
		// Look for label: value pairs
		const pairRegex = /<(?:li|span|p|div)[^>]*>([\s\S]*?)<\/(?:li|span|p|div)>/gi;
		let pairMatch;
		while ((pairMatch = pairRegex.exec(section)) !== null) {
			const text = stripTags(pairMatch[1]);
			// Try "Label: Value" or "Label - Value" patterns
			const kvMatch = text.match(/^([^:–-]+)[:\s–-]+(.+)$/);
			if (kvMatch) {
				parseSpecPair(kvMatch[1].toLowerCase().trim(), kvMatch[2].trim(), specs);
			}
		}
	}

	return specs;
}

// ---------------------------------------------------------------------------
// Strategy D: Free-text spec mining
// ---------------------------------------------------------------------------

function parseSpecsFromText(text: string): Partial<ExtractedSpecs> {
	const specs: Partial<ExtractedSpecs> = {};

	// Voltage
	const voltMatch = text.match(/(\d{2})\s*[Vv](?:olt)?(?:\s|,|\.|\b)/);
	if (voltMatch) {
		const v = parseNum(voltMatch[1]);
		if (validateSpec('voltage', v)) specs.voltage = v;
	}

	// Battery Wh
	const whMatch = text.match(/(\d+\.?\d*)\s*Wh/i);
	if (whMatch) {
		const wh = parseNum(whMatch[1]);
		if (validateSpec('batteryWh', wh)) specs.batteryWh = wh;
	}

	// Battery Ah
	const ahMatch = text.match(/(\d+\.?\d*)\s*Ah/i);
	if (ahMatch) {
		const ah = parseNum(ahMatch[1]);
		if (validateSpec('ampHours', ah)) specs.ampHours = ah;
	}

	// Compute Wh from V * Ah if we have both but no Wh
	if (!specs.batteryWh && specs.voltage && specs.ampHours) {
		const wh = specs.voltage * specs.ampHours;
		if (validateSpec('batteryWh', wh)) specs.batteryWh = wh;
	}

	// Motor watts — look for "XXXW motor" or "XXXWatt" or "motor: XXXW"
	const motorPatterns = [
		/(\d+)\s*[Ww](?:att)?\s*(?:motor|peak|rated|nominal)/i,
		/motor[:\s]+(\d+)\s*[Ww]/i,
		/(\d+)\s*[Ww]\s*[x×]\s*(\d+)/i, // dual motor: 1000W x 2
	];
	for (const pat of motorPatterns) {
		const m = text.match(pat);
		if (m) {
			let watts = parseNum(m[1]);
			if (m[2]) watts *= parseNum(m[2]); // dual motor
			if (validateSpec('motorWatts', watts)) {
				specs.motorWatts = watts;
				break;
			}
		}
	}
	// Fallback: standalone "XXXW" near relevant context
	if (!specs.motorWatts) {
		const wattFallback = text.match(/\b(\d{3,5})\s*[Ww]\b/);
		if (wattFallback) {
			const w = parseNum(wattFallback[1]);
			if (validateSpec('motorWatts', w)) specs.motorWatts = w;
		}
	}

	// Top speed — prefer km/h, convert mph
	const speedKmh = text.match(/(\d+\.?\d*)\s*km\s*\/?\s*h/i);
	const speedMph = text.match(/(\d+\.?\d*)\s*mph/i);
	if (speedKmh) {
		const s = parseNum(speedKmh[1]);
		if (validateSpec('topSpeed', s)) specs.topSpeed = s;
	} else if (speedMph) {
		const s = mphToKmh(parseNum(speedMph[1]));
		if (validateSpec('topSpeed', s)) specs.topSpeed = s;
	}

	// Range — prefer km, convert miles (exclude km/h speed values)
	const rangeKm = text.match(/(\d+\.?\d*)\s*km(?!\s*\/?\s*h)(?:\s*range)?/i);
	const rangeMi = text.match(/(\d+\.?\d*)\s*(?:mi(?:les?)?)\s*(?:range)?/i);
	if (rangeKm) {
		const r = parseNum(rangeKm[1]);
		if (validateSpec('range', r)) specs.range = r;
	} else if (rangeMi) {
		const r = milesToKm(parseNum(rangeMi[1]));
		if (validateSpec('range', r)) specs.range = r;
	}

	// Weight — prefer kg, convert lbs
	const weightKg = text.match(/(\d+\.?\d*)\s*kg/i);
	const weightLbs = text.match(/(\d+\.?\d*)\s*(?:lbs?|pounds?)/i);
	if (weightKg) {
		const w = parseNum(weightKg[1]);
		if (validateSpec('weight', w)) specs.weight = w;
	} else if (weightLbs) {
		const w = lbsToKg(parseNum(weightLbs[1]));
		if (validateSpec('weight', w)) specs.weight = w;
	}

	// Wheel size
	const wheelMatch = text.match(/(\d+\.?\d*)\s*(?:"|″|inch|in\b)/i);
	if (wheelMatch) {
		const ws = parseNum(wheelMatch[1]);
		if (validateSpec('wheelSize', ws)) specs.wheelSize = ws;
	}

	// Charge time
	const chargeMatch = text.match(/(\d+\.?\d*)\s*(?:hrs?|hours?)\s*(?:charg|to\s+full|full\s+charge)?/i);
	if (chargeMatch) {
		const ct = parseNum(chargeMatch[1]);
		if (validateSpec('chargeTime', ct)) specs.chargeTime = ct;
	}

	// Max rider weight
	const riderMatch = text.match(
		/(?:max|maximum)\s+(?:load\s*(?:capacity)?|rider\s*(?:weight)?|weight\s*(?:capacity)?|capacity)[:\s]+(\d+)\s*(kg|lbs?)/i
	);
	if (riderMatch) {
		let rw = parseNum(riderMatch[1]);
		if (/lb/i.test(riderMatch[2])) rw = lbsToKg(rw);
		if (validateSpec('maxRiderWeight', rw)) specs.maxRiderWeight = rw;
	}

	// Hill grade
	const hillMatch = text.match(/(\d+)\s*[°%]\s*(?:hill|grade|incline|climb)/i);
	if (hillMatch) {
		const hg = parseNum(hillMatch[1]);
		if (validateSpec('hillGrade', hg)) specs.hillGrade = hg;
	}

	return specs;
}

// ---------------------------------------------------------------------------
// Shared label→value parser for table/list extraction
// ---------------------------------------------------------------------------

function parseSpecPair(label: string, value: string, specs: Partial<ExtractedSpecs>): void {
	const l = label.toLowerCase().trim();
	const v = value.trim();

	if (/battery\s*capacity|battery\s*wh/i.test(l) || (/^(?:battery|capacity)\b/i.test(l) && /Wh/i.test(v))) {
		const m = v.match(/(\d+\.?\d*)\s*Wh/i) || v.match(/(\d+\.?\d*)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('batteryWh', n)) specs.batteryWh = n;
		}
	} else if (/^(?:battery|capacity)\b/i.test(l) && /Ah/i.test(v)) {
		const m = v.match(/(\d+\.?\d*)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('ampHours', n)) specs.ampHours = n;
		}
	} else if (/^(?:voltage|rated\s*voltage)/i.test(l)) {
		const m = v.match(/(\d+)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('voltage', n)) specs.voltage = n;
		}
	} else if (/motor\s*(?:power|watt)|^(?:power|wattage|motor)\b/i.test(l)) {
		const m = v.match(/(\d+)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('motorWatts', n)) specs.motorWatts = n;
		}
	} else if (/top\s*speed|max\s*speed|speed/i.test(l)) {
		const mph = v.match(/(\d+\.?\d*)\s*mph/i);
		const kmh = v.match(/(\d+\.?\d*)\s*km/i);
		if (kmh) {
			const n = parseNum(kmh[1]);
			if (validateSpec('topSpeed', n)) specs.topSpeed = n;
		} else if (mph) {
			const n = mphToKmh(parseNum(mph[1]));
			if (validateSpec('topSpeed', n)) specs.topSpeed = n;
		} else {
			const m = v.match(/(\d+\.?\d*)/);
			if (m) {
				const n = parseNum(m[1]);
				if (n > 30) {
					if (validateSpec('topSpeed', mphToKmh(n))) specs.topSpeed = mphToKmh(n);
				} else {
					if (validateSpec('topSpeed', n)) specs.topSpeed = n;
				}
			}
		}
	} else if (/^(?:range|max\s*range|distance)/i.test(l)) {
		const mi = v.match(/(\d+\.?\d*)\s*mi/i);
		const km = v.match(/(\d+\.?\d*)\s*km/i);
		if (km) {
			const n = parseNum(km[1]);
			if (validateSpec('range', n)) specs.range = n;
		} else if (mi) {
			const n = milesToKm(parseNum(mi[1]));
			if (validateSpec('range', n)) specs.range = n;
		} else {
			const m = v.match(/(\d+\.?\d*)/);
			if (m) {
				const n = parseNum(m[1]);
				if (validateSpec('range', n)) specs.range = n;
			}
		}
	} else if (/^(?:weight|net\s*weight|scooter\s*weight)/i.test(l)) {
		const lb = v.match(/(\d+\.?\d*)\s*lb/i);
		const kg = v.match(/(\d+\.?\d*)\s*kg/i);
		if (kg) {
			const n = parseNum(kg[1]);
			if (validateSpec('weight', n)) specs.weight = n;
		} else if (lb) {
			const n = lbsToKg(parseNum(lb[1]));
			if (validateSpec('weight', n)) specs.weight = n;
		} else {
			const m = v.match(/(\d+\.?\d*)/);
			if (m) {
				const n = parseNum(m[1]);
				if (validateSpec('weight', n)) specs.weight = n;
			}
		}
	} else if (/wheel\s*size|tire\s*size|tire/i.test(l)) {
		const m = v.match(/(\d+\.?\d*)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('wheelSize', n)) specs.wheelSize = n;
		}
	} else if (/charg(?:e|ing)\s*time/i.test(l)) {
		const m = v.match(/(\d+\.?\d*)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('chargeTime', n)) specs.chargeTime = n;
		}
	} else if (/max\s*(?:load|rider|capacity|weight\s*capacity)/i.test(l)) {
		const lb = v.match(/(\d+\.?\d*)\s*lb/i);
		const kg = v.match(/(\d+\.?\d*)\s*kg/i);
		if (kg) {
			const n = parseNum(kg[1]);
			if (validateSpec('maxRiderWeight', n)) specs.maxRiderWeight = n;
		} else if (lb) {
			const n = lbsToKg(parseNum(lb[1]));
			if (validateSpec('maxRiderWeight', n)) specs.maxRiderWeight = n;
		}
	} else if (/(?:hill|grade|incline|climb)/i.test(l)) {
		const m = v.match(/(\d+)/);
		if (m) {
			const n = parseNum(m[1]);
			if (validateSpec('hillGrade', n)) specs.hillGrade = n;
		}
	} else if (/^price/i.test(l)) {
		const m = v.match(/[\d,]+\.?\d*/);
		if (m) {
			const n = parseNum(m[0]);
			if (validateSpec('price', n)) specs.price = n;
		}
	}
}

// ---------------------------------------------------------------------------
// Main extraction pipeline
// ---------------------------------------------------------------------------

const CORE_SPEC_KEYS: (keyof ExtractedSpecs)[] = ['voltage', 'batteryWh', 'motorWatts', 'topSpeed', 'range', 'weight'];

function deriveWh(merged: Partial<ExtractedSpecs>): void {
	if (!merged.batteryWh && merged.voltage && merged.ampHours) {
		merged.batteryWh = Math.round(merged.voltage * merged.ampHours);
	}
}

function isMergedComplete(merged: Partial<ExtractedSpecs>): boolean {
	deriveWh(merged);
	return CORE_SPEC_KEYS.filter((k) => merged[k] !== undefined).length >= 3;
}

function extractSpecsFromHtml(html: string): { specs: Partial<ExtractedSpecs>; strategies: string[] } {
	const merged: Partial<ExtractedSpecs> = {};
	const strategies: string[] = [];

	// Strategy A: JSON-LD (most reliable)
	const jsonLd = extractFromJsonLd(html);
	if (Object.keys(jsonLd).length > 0) {
		strategies.push('json-ld');
		Object.assign(merged, jsonLd);
	}

	if (!isMergedComplete(merged)) {
		// Strategy B: Spec tables
		const tables = extractFromSpecTables(html);
		if (Object.keys(tables).length > 0) {
			strategies.push('spec-table');
			for (const [k, v] of Object.entries(tables)) {
				if (!(k in merged)) (merged as Record<string, unknown>)[k] = v;
			}
		}
	}

	if (!isMergedComplete(merged)) {
		// Strategy C: Spec sections
		const sections = extractFromSpecSections(html);
		if (Object.keys(sections).length > 0) {
			strategies.push('spec-section');
			for (const [k, v] of Object.entries(sections)) {
				if (!(k in merged)) (merged as Record<string, unknown>)[k] = v;
			}
		}
	}

	if (!isMergedComplete(merged)) {
		// Strategy D: Free-text mining on body slice only (least reliable, fills remaining gaps)
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		const bodyHtml = bodyMatch ? bodyMatch[1] : html;
		const textSpecs = parseSpecsFromText(stripTags(bodyHtml));
		if (Object.keys(textSpecs).length > 0) {
			strategies.push('text-mining');
			for (const [k, v] of Object.entries(textSpecs)) {
				if (!(k in merged)) (merged as Record<string, unknown>)[k] = v;
			}
		}
	}

	// Final Wh derivation pass (also runs inside isMergedComplete but may not have fired if already complete)
	deriveWh(merged);

	return { specs: merged, strategies };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enrich a single candidate by fetching its product page and extracting specs.
 * Does NOT mutate the candidate — returns what was found.
 */
export async function enrichCandidate(candidate: PresetCandidate): Promise<EnrichmentResult> {
	const url = candidate.sources.discoveredFrom;

	if (!url) {
		return {
			success: false,
			specsFound: {},
			specsQuality: 'stub',
			strategies: [],
			errors: ['No source URL available'],
		};
	}

	const page = await fetchPageHttp(url);
	if (!page.ok) {
		return {
			success: false,
			specsFound: {},
			specsQuality: candidate.specsQuality || 'stub',
			strategies: [],
			errors: [`Failed to fetch ${url}: ${page.error ?? `HTTP ${page.status}`}`],
		};
	}

	const { specs, strategies } = extractSpecsFromHtml(page.html);
	const specCount = Object.keys(specs).length;

	if (specCount === 0) {
		return {
			success: false,
			specsFound: {},
			specsQuality: candidate.specsQuality || 'stub',
			strategies,
			errors: ['No specs found in page HTML'],
		};
	}

	// Assess quality of what we found
	const qualityInput: Record<string, number | undefined> = {
		voltage: specs.voltage,
		batteryWh: specs.batteryWh,
		motorWatts: specs.motorWatts,
		topSpeed: specs.topSpeed,
		range: specs.range,
		weight: specs.weight,
		wheelSize: specs.wheelSize,
	};
	const quality = assessSpecsQuality(qualityInput);

	return {
		success: true,
		specsFound: specs,
		specsQuality: quality,
		strategies,
	};
}

/**
 * Enrich multiple candidates with rate limiting.
 */
export async function enrichBatch(
	candidates: PresetCandidate[],
	options?: { concurrency?: number; delayMs?: number }
): Promise<BatchEnrichmentResult> {
	const concurrency = options?.concurrency ?? 3;
	const delayMs = options?.delayMs ?? 1000;
	const results = new Map<string, EnrichmentResult>();
	const errors: string[] = [];
	let enriched = 0;
	let stillStub = 0;

	// Process in chunks
	for (let i = 0; i < candidates.length; i += concurrency) {
		const chunk = candidates.slice(i, i + concurrency);
		const promises = chunk.map(async (c) => {
			try {
				const result = await enrichCandidate(c);
				results.set(c.key, result);
				if (result.success && result.specsQuality !== 'stub') {
					enriched++;
				} else {
					stillStub++;
				}
			} catch (e) {
				const msg = `Error enriching ${c.key}: ${e instanceof Error ? e.message : String(e)}`;
				errors.push(msg);
				stillStub++;
			}
		});

		await Promise.all(promises);

		// Rate limit between chunks
		if (i + concurrency < candidates.length) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return {
		total: candidates.length,
		enriched,
		stillStub,
		errors,
		results,
	};
}

/**
 * Apply enrichment results to a candidate, returning the updated candidate.
 * Does NOT persist — caller must save via candidate store.
 */
export function applyEnrichment(candidate: PresetCandidate, result: EnrichmentResult): PresetCandidate {
	if (!result.success || Object.keys(result.specsFound).length === 0) {
		return candidate;
	}

	const updated = { ...candidate };
	updated.manufacturerSpecs = { ...candidate.manufacturerSpecs };

	const s = result.specsFound;
	if (s.topSpeed !== undefined && !updated.manufacturerSpecs.topSpeed) updated.manufacturerSpecs.topSpeed = s.topSpeed;
	if (s.range !== undefined && !updated.manufacturerSpecs.range) updated.manufacturerSpecs.range = s.range;
	if (s.batteryWh !== undefined && !updated.manufacturerSpecs.batteryWh)
		updated.manufacturerSpecs.batteryWh = s.batteryWh;
	if (s.motorWatts !== undefined && !updated.manufacturerSpecs.motorWatts)
		updated.manufacturerSpecs.motorWatts = s.motorWatts;
	if (s.weight !== undefined && !updated.manufacturerSpecs.weight) updated.manufacturerSpecs.weight = s.weight;
	if (s.wheelSize !== undefined && !updated.manufacturerSpecs.wheelSize)
		updated.manufacturerSpecs.wheelSize = s.wheelSize;
	if (s.price !== undefined && !updated.manufacturerSpecs.price) updated.manufacturerSpecs.price = s.price;
	if (s.ampHours !== undefined && !updated.manufacturerSpecs.ampHours) updated.manufacturerSpecs.ampHours = s.ampHours;
	if (s.chargeTime !== undefined && !updated.manufacturerSpecs.chargeTime)
		updated.manufacturerSpecs.chargeTime = s.chargeTime;
	if (s.maxRiderWeight !== undefined && !updated.manufacturerSpecs.maxRiderWeight)
		updated.manufacturerSpecs.maxRiderWeight = s.maxRiderWeight;
	if (s.hillGrade !== undefined && !updated.manufacturerSpecs.hillGrade)
		updated.manufacturerSpecs.hillGrade = s.hillGrade;

	updated.specsQuality = result.specsQuality;

	return updated;
}

// Re-export for use by API endpoint
export { parseSpecsFromText, extractSpecsFromHtml, stripTags };
