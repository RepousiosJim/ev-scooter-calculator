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
	scooterWeight: { min: 5, max: 65, label: 'Scooter Weight' },
} as const;

// Cross-field validation rules
const CROSS_CHECKS = {
	// Battery Wh should be V * Ah (with 5% tolerance)
	batteryWh: (config: ScooterConfig, claimedWh?: number) => {
		if (!claimedWh) return null;
		const calcWh = config.v * config.ah;
		const diff = Math.abs(calcWh - claimedWh) / claimedWh;
		if (diff > 0.15) return {
			field: 'batteryWh',
			severity: 'error' as const,
			message: `V×Ah (${calcWh.toFixed(0)}Wh) differs from claimed ${claimedWh}Wh by ${(diff * 100).toFixed(0)}%`,
			expected: `${claimedWh}Wh`
		};
		if (diff > 0.05) return {
			field: 'batteryWh',
			severity: 'warning' as const,
			message: `V×Ah (${calcWh.toFixed(0)}Wh) differs from claimed ${claimedWh}Wh by ${(diff * 100).toFixed(0)}%`,
			expected: `${claimedWh}Wh`
		};
		return null;
	},
	// Power-to-weight ratio should be plausible
	powerToWeight: (config: ScooterConfig) => {
		const totalPower = config.watts * config.motors;
		const totalWeight = config.weight + (config.scooterWeight || 0);
		const ratio = totalPower / totalWeight;
		// < 5 W/kg is very underpowered, > 80 W/kg is extreme
		if (ratio > 100) return {
			field: 'power-to-weight',
			severity: 'error' as const,
			message: `Power-to-weight ratio ${ratio.toFixed(1)} W/kg is impossibly high`,
		};
		if (ratio < 3) return {
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
		if (config.v <= 36 && totalPower > 2000) return {
			field: 'voltage-power',
			severity: 'warning' as const,
			message: `${config.v}V system with ${totalPower}W is unusual — check voltage or power`,
		};
		if (config.v >= 60 && totalPower < 500) return {
			field: 'voltage-power',
			severity: 'warning' as const,
			message: `${config.v}V system with only ${totalPower}W is unusual — check voltage or power`,
		};
		return null;
	},
	// C-rate shouldn't be extreme
	cRate: (config: ScooterConfig) => {
		const totalPower = config.watts * config.motors;
		const wh = config.v * config.ah;
		const cRate = totalPower / wh;
		if (cRate > 5) return {
			field: 'c-rate',
			severity: 'error' as const,
			message: `C-rate of ${cRate.toFixed(1)}C is dangerously high — check battery capacity`,
		};
		if (cRate > 3.5) return {
			field: 'c-rate',
			severity: 'warning' as const,
			message: `C-rate of ${cRate.toFixed(1)}C is high — battery may sag under load`,
		};
		return null;
	}
};

export function validateConfig(config: ScooterConfig, claimedSpecs?: { batteryWh?: number }): ValidationResult {
	const issues: ValidationIssue[] = [];

	// Range checks
	for (const [key, range] of Object.entries(RANGES)) {
		const value = (config as any)[key];
		if (value === undefined || value === null) continue;
		if (value < range.min || value > range.max) {
			issues.push({
				field: key,
				severity: value < range.min * 0.5 || value > range.max * 2 ? 'error' : 'warning',
				message: `${range.label} (${value}) outside expected range ${range.min}-${range.max}`,
				expected: `${range.min}-${range.max}`
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
	if (!config.ah || config.ah === 0) issues.push({ field: 'ah', severity: 'error', message: 'Battery capacity is required' });
	if (!config.watts || config.watts === 0) issues.push({ field: 'watts', severity: 'error', message: 'Motor power is required' });

	const errors = issues.filter(i => i.severity === 'error').length;
	const warnings = issues.filter(i => i.severity === 'warning').length;

	// Confidence: start at 100, -20 per error, -5 per warning
	const confidence = Math.max(0, 100 - errors * 20 - warnings * 5);

	return {
		valid: errors === 0,
		issues,
		confidence
	};
}
