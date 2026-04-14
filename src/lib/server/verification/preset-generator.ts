/**
 * Converts discovered/verified scooter specs into preset entries.
 * Maps raw extracted data to the ScooterConfig format used by the physics engine.
 */
import type { ScooterConfig } from '$lib/types';
import type { DiscoveredScooter } from './discovery';
import type { ScooterVerification, SpecField } from './types';
import { validateConfig, type ValidationResult } from './physics-validator';

/** Quality tier indicating how much real data we have for this candidate */
export type SpecsQuality = 'complete' | 'partial' | 'stub';

export interface PresetCandidate {
	/** Unique key for the preset (e.g., "varla_eagle_one") */
	key: string;
	/** Display name */
	name: string;
	/** Model year */
	year: number;
	/** Generated ScooterConfig for the physics engine */
	config: ScooterConfig;
	/** Manufacturer spec claims (for PresetMetadata) */
	manufacturerSpecs: {
		topSpeed?: number;
		range?: number;
		batteryWh?: number;
		price?: number;
		motorWatts?: number;
		weight?: number;
		wheelSize?: number;
		/** Extended identity fields */
		ampHours?: number;
		chargerAmps?: number;
		chargeTime?: number;
		motorCount?: number;
		motorType?: 'hub' | 'belt' | 'chain';
		tireType?: 'pneumatic' | 'solid' | 'honeycomb';
		suspensionType?: 'none' | 'spring' | 'hydraulic' | 'air';
		ipRating?: string;
		brakeType?: 'disc' | 'drum' | 'electronic' | 'regenerative';
		maxRiderWeight?: number;
		hillGrade?: number;
	};
	/** Physics validation result */
	validation: ValidationResult;
	/** How much real data we have ('complete' = 3+ specs, 'partial' = 1-2, 'stub' = defaults only) */
	specsQuality: SpecsQuality;
	/** Data source info */
	sources: {
		discoveredFrom?: string;
		verificationData?: string;
		extractedAt: string;
	};
	/** Status in the pipeline */
	status: 'pending' | 'approved' | 'rejected';
	/** Optional admin notes */
	notes?: string;
}

/**
 * Marketing suffixes stripped from product names before key generation.
 * Ordered longest-first to avoid partial matches.
 */
const MARKETING_SUFFIXES = [
	// Long phrases first (longest-first order to avoid partial matches)
	'with app control adult',
	'built for daily commutes',
	'strong yet comfortable ride',
	'full suspension comfort up to',
	'greater market range',
	'front suspension teens adults',
	'for kids and adults',
	'teens and adults',
	'teens adults',
	'foldable handlebar',
	'upgraded version',
	'2026 upgraded',
	'2025 upgraded',
	'2024 upgraded',
	'best budget',
	'maximum power',
	"world's first bike",
	"world's first",
	'worlds first',
	'electric scooter',
	'eco friendly',
	'eco-friendly',
	'dgt certified',
	'abe certified',
	'all terrain',
	'all-terrain',
	'new release',
	'new arrival',
	'single motor',
	'dual motor',
	'long range',
	'commuting',
	'off road',
	'off-road',
	'big wheel',
	'big-wheel',
	'for adults',
	'for kids',
	'e-scooter',
	'escooter',
	'foldable',
	'powerful',
	'high end',
	'high-end',
	'premium',
	'urban',
	'smart',
	'ekfv',
];

/**
 * Generate a preset key from a scooter name.
 * Strips marketing text, normalizes to a clean identifier.
 *
 * e.g., "isinwheel S10MAX 1000W High-End Commuting Electric Scooter 2026 Upgraded Version"
 *       → "isinwheel_s10max_1000w"
 *
 * e.g., "Varla Eagle One V3.0 Off-Road Explorer" → "varla_eagle_one_v3_0"
 */
/** Known manufacturer IDs for cross-prefix detection */
const KNOWN_MANUFACTURER_IDS = new Set([
	'apollo',
	'segway',
	'kaabo',
	'emove',
	'nami',
	'vsett',
	'xiaomi',
	'niu',
	'gotrax',
	'hiboy',
	'dualtron',
	'inmotion',
	'teverun',
	'unagi',
	'inokim',
	'navee',
	'varla',
	'zero',
	'blade',
	'mercane',
	'turboant',
	'levy',
	'pure',
	'uscooters',
	'mukuta',
	'roadrunner',
	'evercross',
	'nanrobot',
	'joyor',
	'yume',
	'weped',
	'currus',
	'speedway',
	'razor',
	'hover1',
	'kugoo',
	'yadea',
	'sxt',
	'oxboards',
	'fluid',
	'techlife',
	'fluidfreeride',
	'voromotors',
	'revrides',
	'isinwheel',
	'ninebot',
	'minimotors',
]);

export function generatePresetKey(name: string, manufacturerId?: string): string {
	let clean = name.toLowerCase().trim();

	// Strip "Product Name :" prefix (raw data artifact from some sites)
	clean = clean.replace(/^product\s+name\s*:\s*/i, '');

	// Strip price strings embedded in the name: €862,95  $599  £1,299.00
	clean = clean.replace(/[€$£]\s*[\d,]+\.?\d*/g, '');
	clean = clean.replace(/\d+[.,]\d{2,}\s*[€$£]/g, '');

	// Strip "E-Scooter", "Electric Scooter", "Escooter", "e-scooter" labels
	clean = clean.replace(/\belectric\s+scooter\b/gi, '');
	clean = clean.replace(/\be-scooter\b/gi, '');
	clean = clean.replace(/\bescooter\b/gi, '');

	// Strip wattage patterns: "800W", "1200W", "2x1600W", "500w"
	clean = clean.replace(/\b\d+x?\d*\s*w\b/gi, '');

	// Strip "model YYYY" certification labels
	clean = clean.replace(/\bmodel\s+\d{4}\b/gi, '');

	// Strip marketing suffixes (longest first to avoid partial matches)
	for (const suffix of MARKETING_SUFFIXES) {
		// Replace suffix anywhere, case-insensitive, with optional surrounding dashes/spaces
		clean = clean.replace(
			new RegExp(`[\\s\\-–]*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\-–]*`, 'gi'),
			' '
		);
	}

	// Strip speed/range marketing: "20 MPH Speed", "42-Mile Range", "25 MPH"
	clean = clean.replace(/\d+[\s-]*(mph|km\/h)\s*(speed)?/gi, '');
	clean = clean.replace(/\d+[\s-]*(mile|km)\s*(range)?/gi, '');

	// Strip spec-in-name marketing when redundant: "72V 25Ah" but keep "1000W" as it's often part of model name
	// Only strip "NNV NNAh" if there's other identifying text
	const modelWords = clean.replace(/\d+v\s*\d+ah/gi, '').trim();
	if (modelWords.length > 5) {
		clean = modelWords;
	}

	// Strip common filler words at the end: "Ce...", "Samsung Ce..."
	clean = clean.replace(/\bsamsung\b.*$/i, '').trim();
	clean = clean.replace(/\bce\.{2,}.*$/i, '').trim();

	// Normalize separators
	clean = clean
		.replace(/[()[\]{}]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
		.replace(/_+/g, '_');

	// If manufacturer ID is provided but already at start, don't duplicate
	if (manufacturerId) {
		const mfr = manufacturerId.toLowerCase().replace(/[^a-z0-9]+/g, '_');
		if (!clean.startsWith(mfr)) {
			// Detect cross-manufacturer prefix: if the first segment of the cleaned name
			// is actually a DIFFERENT known manufacturer, remove it before prefixing
			const firstSegment = clean.split('_')[0];
			if (KNOWN_MANUFACTURER_IDS.has(firstSegment) && firstSegment !== mfr) {
				clean = clean.slice(firstSegment.length).replace(/^_/, '');
			}
			clean = `${mfr}_${clean}`;
		}
	}

	// Truncate to 45 chars (leaves headroom under 50-char limit)
	if (clean.length > 45) {
		clean = clean.slice(0, 45);
		// Don't end on a partial word — trim to last underscore
		const lastUnderscore = clean.lastIndexOf('_');
		if (lastUnderscore > 10) {
			clean = clean.slice(0, lastUnderscore);
		}
	}

	// Final cleanup
	clean = clean.replace(/^_|_$/g, '').replace(/_+/g, '_');

	// Ensure it starts with a letter (prefix with 'x' if starts with number)
	if (/^\d/.test(clean)) {
		clean = `x${clean}`;
	}

	return clean || 'unknown_scooter';
}

/**
 * Infer voltage from battery Wh and common battery configurations.
 * Most scooters use standard voltage tiers: 36V, 48V, 52V, 60V, 72V
 */
function inferVoltage(batteryWh?: number, motorWatts?: number): number {
	if (!batteryWh) return 48; // Default

	// Common voltage tiers and typical Wh ranges
	const tiers = [
		{ v: 36, minWh: 150, maxWh: 700 },
		{ v: 48, minWh: 400, maxWh: 1500 },
		{ v: 52, minWh: 500, maxWh: 2000 },
		{ v: 60, minWh: 800, maxWh: 3500 },
		{ v: 72, minWh: 1500, maxWh: 5500 },
	];

	// If motor power is high, bias toward higher voltages
	const powerBias = (motorWatts || 0) > 3000 ? 60 : (motorWatts || 0) > 1500 ? 52 : 0;

	// Find best matching voltage where Wh / V gives a reasonable Ah
	for (const tier of tiers.reverse()) {
		const ah = batteryWh / tier.v;
		if (ah >= 5 && ah <= 50 && batteryWh >= tier.minWh && batteryWh <= tier.maxWh) {
			return tier.v;
		}
	}

	// Fallback: use power bias or default
	return powerBias || 48;
}

/**
 * Infer motor count from total power and price tier.
 */
function inferMotorCount(totalWatts?: number, price?: number): 1 | 2 {
	if (!totalWatts) return 1;
	// Dual motors are common above 2000W total or premium price
	if (totalWatts >= 2000 || (price && price >= 2000)) return 2;
	return 1;
}

/**
 * Infer wheel size from weight/power class.
 */
function inferWheelSize(weight?: number, motorWatts?: number): number {
	if (!motorWatts) return 10;
	if (motorWatts >= 2000) return 11;
	if (motorWatts >= 800) return 10;
	if (motorWatts >= 400) return 8.5;
	return 8;
}

/**
 * Convert discovered scooter specs into a ScooterConfig.
 * Fills in gaps with physics-based inference.
 */
export function specsToConfig(specs: {
	voltage?: number;
	batteryWh?: number;
	motorWatts?: number;
	weight?: number;
	wheelSize?: number;
	topSpeed?: number;
	range?: number;
	price?: number;
}): ScooterConfig {
	const voltage = specs.voltage || inferVoltage(specs.batteryWh, specs.motorWatts);
	const ah = specs.batteryWh ? specs.batteryWh / voltage : 16;
	const motors = inferMotorCount(specs.motorWatts, specs.price);
	const perMotorWatts = specs.motorWatts ? Math.round(specs.motorWatts / motors) : 500;
	const wheel = specs.wheelSize || inferWheelSize(specs.weight, specs.motorWatts);

	return {
		v: voltage,
		ah: Math.round(ah * 10) / 10,
		watts: perMotorWatts,
		motors,
		wheel,
		weight: 80, // Default rider weight
		scooterWeight: specs.weight || undefined,
		style: 15, // Default moderate riding style (Wh/km)
		charger: 3, // Default 3A charger
		regen: 0, // Default no regen
		cost: 0.12, // Default electricity cost
		slope: 0,
		ridePosition: 0.5, // Default drag coefficient
		dragCoefficient: 0.6,
		frontalArea: 0.5,
		rollingResistance: 0.015,
		soh: 1, // Full battery health
		ambientTemp: 20,
	};
}

/**
 * Assess the quality of discovered specs.
 * - 'complete': has 3+ real specs (voltage/batteryWh + motorWatts + at least one of topSpeed/range/weight)
 * - 'partial': has 1-2 real specs (e.g., just price, or just motorWatts)
 * - 'stub': no real specs at all — defaults only
 */
export function assessSpecsQuality(specs: Record<string, number | undefined>): SpecsQuality {
	const realSpecs = [
		specs.voltage,
		specs.batteryWh,
		specs.motorWatts,
		specs.topSpeed,
		specs.range,
		specs.weight,
		specs.wheelSize,
	].filter((v) => v !== undefined && v > 0);

	if (realSpecs.length >= 3) return 'complete';
	if (realSpecs.length >= 1) return 'partial';
	return 'stub';
}

/**
 * Create a full preset candidate from a discovered scooter.
 * Uses smarter key generation and tracks specs quality.
 */
export function createCandidate(discovered: DiscoveredScooter, verification?: ScooterVerification): PresetCandidate {
	// Merge discovery specs with verification data (verification takes priority)
	const specs: Record<string, number | undefined> = { ...discovered.specs };

	if (verification) {
		const fieldMap: Record<string, SpecField> = {
			topSpeed: 'topSpeed',
			range: 'range',
			batteryWh: 'batteryWh',
			price: 'price',
			motorWatts: 'motorWatts',
			weight: 'weight',
			wheelSize: 'wheelSize',
			voltage: 'voltage',
		};

		for (const [specKey, fieldKey] of Object.entries(fieldMap)) {
			const field = verification.fields[fieldKey];
			if (field?.verifiedValue !== undefined) {
				specs[specKey] = field.verifiedValue;
			} else if (field?.sources.length) {
				// Use median of source values
				const values = field.sources
					.map((s) => s.value)
					.filter((v): v is number => v !== undefined)
					.sort((a, b) => a - b);
				if (values.length > 0) {
					specs[specKey] = values[Math.floor(values.length / 2)];
				}
			}
		}
	}

	const config = specsToConfig(specs as Parameters<typeof specsToConfig>[0]);
	const specsQuality = assessSpecsQuality(specs);

	// Add a validation issue if specs quality is poor
	const validation = validateConfig(config, { batteryWh: specs.batteryWh as number | undefined });
	if (specsQuality === 'stub') {
		validation.issues.push({
			field: 'batteryWh',
			severity: 'error',
			message: 'Insufficient specs: no real data extracted — all values are defaults',
		});
		validation.confidence = Math.min(validation.confidence, 20);
	} else if (specsQuality === 'partial') {
		validation.issues.push({
			field: 'batteryWh',
			severity: 'warning',
			message: 'Partial specs: some values are inferred defaults — needs enrichment',
		});
		validation.confidence = Math.min(validation.confidence, 60);
	}

	// Use smarter key generation with manufacturer context
	const key = discovered.matchedKey || generatePresetKey(discovered.name, discovered.manufacturerId);

	return {
		key,
		name: discovered.name,
		year: discovered.year || new Date().getFullYear(),
		config,
		manufacturerSpecs: {
			topSpeed: specs.topSpeed as number | undefined,
			range: specs.range as number | undefined,
			batteryWh: specs.batteryWh as number | undefined,
			price: specs.price as number | undefined,
			motorWatts: specs.motorWatts as number | undefined,
			weight: specs.weight as number | undefined,
			wheelSize: specs.wheelSize as number | undefined,
		},
		specsQuality,
		validation,
		sources: {
			discoveredFrom: discovered.manufacturer,
			extractedAt: new Date().toISOString(),
		},
		status: 'pending',
	};
}

/**
 * Generate TypeScript code for a preset entry (for copy-pasting into presets.ts).
 */
export function generatePresetCode(candidate: PresetCandidate): string {
	const c = candidate.config;
	const m = candidate.manufacturerSpecs;

	const configLines = [
		`  ${candidate.key}: {`,
		`    v: ${c.v}, ah: ${c.ah}, watts: ${c.watts}, motors: ${c.motors}, wheel: ${c.wheel},`,
		`    weight: ${c.weight}, style: ${c.style}, charger: ${c.charger}, regen: ${c.regen}, cost: ${c.cost},`,
		c.scooterWeight ? `    scooterWeight: ${c.scooterWeight},` : null,
		`    dragCoefficient: ${c.dragCoefficient}, frontalArea: ${c.frontalArea}, rollingResistance: ${c.rollingResistance},`,
		`    slope: 0, ridePosition: ${c.ridePosition}, soh: ${c.soh}, ambientTemp: ${c.ambientTemp},`,
		`  },`,
	]
		.filter(Boolean)
		.join('\n');

	const metaLines = [
		`  ${candidate.key}: {`,
		`    name: "${candidate.name}", year: ${candidate.year},`,
		`    manufacturer: {`,
		m.topSpeed ? `      topSpeed: ${m.topSpeed},` : null,
		m.range ? `      range: ${m.range},` : null,
		m.batteryWh ? `      batteryWh: ${m.batteryWh},` : null,
		m.price ? `      price: ${m.price},` : null,
		`    },`,
		`    status: 'current',`,
		`  },`,
	]
		.filter(Boolean)
		.join('\n');

	return `// Config:\n${configLines}\n\n// Metadata:\n${metaLines}`;
}
