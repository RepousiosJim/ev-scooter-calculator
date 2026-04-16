/**
 * Physics-based validation for scooter configurations.
 * Ensures specs are physically plausible before adding to presets.
 */
import type { ScooterConfig } from '$lib/types';

export interface ValidationIssue {
	field: string;
	severity: 'error' | 'warning';
	message: string;
	expected?: string;
}

export interface ValidationResult {
	valid: boolean;
	issues: ValidationIssue[];
	confidence: number; // 0-100
}

// Reasonable ranges for electric scooter specs
const RANGES = {
	v: { min: 24, max: 100, label: 'System Voltage' },
	ah: { min: 4, max: 100, label: 'Battery Capacity' },
	watts: { min: 200, max: 8000, label: 'Motor Power (per motor)' },
	motors: { min: 1, max: 2, label: 'Motor Count' },
	wheel: { min: 5, max: 14, label: 'Wheel Size' },
	weight: { min: 40, max: 160, label: 'Rider Weight' },
	scooterWeight: { min: 5, max: 90, label: 'Scooter Weight' },
	// Unit-range guards — these fields are easily entered in the wrong unit
	// (soh as 100% instead of 0–1, regen as 1 instead of 0.10, style as
	// a class enum instead of Wh/km, cost as MSRP instead of $/kWh).
	// Range violations here are unit errors, not "unusual but plausible" data.
	soh: { min: 0.1, max: 1, label: 'State of Health (0–1)' },
	regen: { min: 0, max: 0.5, label: 'Regen Efficiency (0–0.5)' },
	style: { min: 10, max: 80, label: 'Riding Style (Wh/km)' },
	ridePosition: { min: 0.3, max: 0.7, label: 'Ride Position Drag Factor' },
	cost: { min: 0.05, max: 1, label: 'Electricity Cost ($/kWh)' },
} as const;

// Cross-field validation rules
const CROSS_CHECKS = {
	// Battery Wh should be V * Ah (with 5% tolerance)
	batteryWh: (config: ScooterConfig, claimedWh?: number) => {
		if (!claimedWh) return null;
		const calcWh = config.v * config.ah;
		const diff = Math.abs(calcWh - claimedWh) / claimedWh;
		if (diff > 0.15)
			return {
				field: 'batteryWh',
				severity: 'error' as const,
				message: `V×Ah (${calcWh.toFixed(0)}Wh) differs from claimed ${claimedWh}Wh by ${(diff * 100).toFixed(0)}%`,
				expected: `${claimedWh}Wh`,
			};
		if (diff > 0.05)
			return {
				field: 'batteryWh',
				severity: 'warning' as const,
				message: `V×Ah (${calcWh.toFixed(0)}Wh) differs from claimed ${claimedWh}Wh by ${(diff * 100).toFixed(0)}%`,
				expected: `${claimedWh}Wh`,
			};
		return null;
	},
	// Power-to-weight ratio should be plausible.
	// Hyper-scooters (Teverun Ultra, etc.) routinely hit 100–150 W/kg at peak.
	// Anything beyond ~200 W/kg is double-counted motor power.
	powerToWeight: (config: ScooterConfig) => {
		const totalPower = config.watts * config.motors;
		const totalWeight = config.weight + (config.scooterWeight || 0);
		const ratio = totalPower / totalWeight;
		if (ratio > 200)
			return {
				field: 'power-to-weight',
				severity: 'error' as const,
				message: `Power-to-weight ratio ${ratio.toFixed(1)} W/kg is impossibly high`,
			};
		if (ratio > 100)
			return {
				field: 'power-to-weight',
				severity: 'warning' as const,
				message: `Power-to-weight ratio ${ratio.toFixed(1)} W/kg is very high — verify peak vs nominal watts`,
			};
		if (ratio < 2)
			return {
				field: 'power-to-weight',
				severity: 'warning' as const,
				message: `Power-to-weight ratio ${ratio.toFixed(1)} W/kg seems very low`,
			};
		return null;
	},
	// Voltage tier should match motor power tier roughly
	voltagePowerMatch: (config: ScooterConfig) => {
		const totalPower = config.watts * config.motors;
		// 24V scooters shouldn't claim 5000W, 72V scooters shouldn't be 250W
		if (config.v <= 36 && totalPower > 2000)
			return {
				field: 'voltage-power',
				severity: 'warning' as const,
				message: `${config.v}V system with ${totalPower}W is unusual — check voltage or power`,
			};
		if (config.v >= 60 && totalPower < 500)
			return {
				field: 'voltage-power',
				severity: 'warning' as const,
				message: `${config.v}V system with only ${totalPower}W is unusual — check voltage or power`,
			};
		return null;
	},
	// C-rate shouldn't be extreme.
	// Modern high-discharge scooter cells (Samsung 50E, LG M50T) handle 5–7C
	// briefly under hard acceleration; anything beyond ~7C is suspect.
	cRate: (config: ScooterConfig) => {
		const totalPower = config.watts * config.motors;
		const wh = config.v * config.ah;
		const cRate = totalPower / wh;
		if (cRate > 7)
			return {
				field: 'c-rate',
				severity: 'error' as const,
				message: `C-rate of ${cRate.toFixed(1)}C is dangerously high — check battery capacity`,
			};
		if (cRate > 5)
			return {
				field: 'c-rate',
				severity: 'warning' as const,
				message: `C-rate of ${cRate.toFixed(1)}C is high — battery may sag under load`,
			};
		return null;
	},
};

/**
 * Fields where any out-of-range value indicates a unit error (e.g. soh as a
 * percentage, regen as a boolean, cost as MSRP). Always flagged as `error`,
 * never `warning` — there is no "unusual but plausible" interpretation.
 */
const UNIT_ERROR_FIELDS = new Set(['soh', 'regen', 'style', 'ridePosition', 'cost']);

export function validateConfig(config: ScooterConfig, claimedSpecs?: { batteryWh?: number }): ValidationResult {
	const issues: ValidationIssue[] = [];

	// Range checks
	for (const [key, range] of Object.entries(RANGES)) {
		const value = config[key as keyof ScooterConfig] as number | undefined;
		if (value === undefined || value === null) continue;
		if (value < range.min || value > range.max) {
			const severity: 'error' | 'warning' = UNIT_ERROR_FIELDS.has(key)
				? 'error'
				: value < range.min * 0.5 || value > range.max * 2
					? 'error'
					: 'warning';
			issues.push({
				field: key,
				severity,
				message: `${range.label} (${value}) outside expected range ${range.min}-${range.max}`,
				expected: `${range.min}-${range.max}`,
			});
		}
	}

	// Cross-field checks
	const whCheck = CROSS_CHECKS.batteryWh(config, claimedSpecs?.batteryWh);
	if (whCheck) issues.push(whCheck);

	const ptwCheck = CROSS_CHECKS.powerToWeight(config);
	if (ptwCheck) issues.push(ptwCheck);

	const vpCheck = CROSS_CHECKS.voltagePowerMatch(config);
	if (vpCheck) issues.push(vpCheck);

	const crCheck = CROSS_CHECKS.cRate(config);
	if (crCheck) issues.push(crCheck);

	// Required field checks
	if (!config.v || config.v === 0) issues.push({ field: 'v', severity: 'error', message: 'Voltage is required' });
	if (!config.ah || config.ah === 0)
		issues.push({ field: 'ah', severity: 'error', message: 'Battery capacity is required' });
	if (!config.watts || config.watts === 0)
		issues.push({ field: 'watts', severity: 'error', message: 'Motor power is required' });

	const errors = issues.filter((i) => i.severity === 'error').length;
	const warnings = issues.filter((i) => i.severity === 'warning').length;

	// Confidence: start at 100, -20 per error, -5 per warning
	const confidence = Math.max(0, 100 - errors * 20 - warnings * 5);

	return {
		valid: errors === 0,
		issues,
		confidence,
	};
}
