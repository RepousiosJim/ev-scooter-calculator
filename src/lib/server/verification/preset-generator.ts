/**
 * Converts discovered/verified scooter specs into preset entries.
 * Maps raw extracted data to the ScooterConfig format used by the physics engine.
 */
import type { ScooterConfig } from '$lib/types';
import type { DiscoveredScooter } from './discovery';
import type { ScooterVerification, SpecField } from './types';
import { validateConfig, type ValidationResult } from './physics-validator';

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
	};
	/** Physics validation result */
	validation: ValidationResult;
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
 * Generate a preset key from a scooter name.
 * e.g., "Varla Eagle One" → "varla_eagle_one"
 */
export function generatePresetKey(name: string): string {
	return name
		.toLowerCase()
		.replace(/[()]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
		.replace(/_+/g, '_');
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
 * Create a full preset candidate from a discovered scooter.
 */
export function createCandidate(
	discovered: DiscoveredScooter,
	verification?: ScooterVerification
): PresetCandidate {
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
					.map(s => s.value)
					.filter((v): v is number => v !== undefined)
					.sort((a, b) => a - b);
				if (values.length > 0) {
					specs[specKey] = values[Math.floor(values.length / 2)];
				}
			}
		}
	}

	const config = specsToConfig(specs as any);
	const validation = validateConfig(config, { batteryWh: specs.batteryWh as number | undefined });
	const key = discovered.matchedKey || generatePresetKey(discovered.name);

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
	].filter(Boolean).join('\n');

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
	].filter(Boolean).join('\n');

	return `// Config:\n${configLines}\n\n// Metadata:\n${metaLines}`;
}
