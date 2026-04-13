import { describe, it, expect } from 'vitest';
import { validateConfig } from '$lib/server/verification/physics-validator';
import type { ScooterConfig } from '$lib/types';

// A valid baseline config that should pass all checks.
// totalPower = 500*1 = 500W, wh = 52*20 = 1040, cRate = 0.48C (safe)
// power-to-weight = 500 / (80+28) = 4.6 W/kg (safe)
const validConfig: ScooterConfig = {
	v: 52,
	ah: 20,
	motors: 1,
	watts: 500,
	style: 25,
	weight: 80,
	wheel: 10,
	charger: 3,
	regen: 0.05,
	cost: 0.2,
	slope: 0,
	ridePosition: 0.5,
	soh: 1,
	ambientTemp: 20,
	scooterWeight: 28,
};

describe('validateConfig — valid config', () => {
	it('passes with no issues for a realistic scooter config', () => {
		const result = validateConfig(validConfig);
		expect(result.valid).toBe(true);
		expect(result.issues).toHaveLength(0);
		expect(result.confidence).toBe(100);
	});

	it('returns a confidence of 100 when there are no issues', () => {
		const result = validateConfig(validConfig);
		expect(result.confidence).toBe(100);
	});
});

describe('validateConfig — range checks (single-field warnings)', () => {
	it('warns when voltage is below 24V', () => {
		const config = { ...validConfig, v: 12 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'v');
		expect(issue).toBeDefined();
		expect(issue!.severity).toBe('warning');
	});

	it('warns when voltage exceeds 100V', () => {
		const config = { ...validConfig, v: 110 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'v');
		expect(issue).toBeDefined();
	});

	it('errors when voltage is extremely low (< 12V, i.e. < min*0.5)', () => {
		const config = { ...validConfig, v: 8 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'v');
		expect(issue!.severity).toBe('error');
	});

	it('warns when battery capacity (ah) is out of range', () => {
		const config = { ...validConfig, ah: 2 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'ah');
		expect(issue).toBeDefined();
	});

	it('warns when watts per motor is below 200W', () => {
		const config = { ...validConfig, watts: 100 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'watts');
		expect(issue).toBeDefined();
	});

	it('warns when watts per motor exceeds 8000W', () => {
		const config = { ...validConfig, watts: 10000 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'watts');
		expect(issue).toBeDefined();
	});

	it('warns when motor count exceeds 2', () => {
		const config = { ...validConfig, motors: 4 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'motors');
		expect(issue).toBeDefined();
	});

	it('warns when wheel size is below 5 inches', () => {
		const config = { ...validConfig, wheel: 3 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'wheel');
		expect(issue).toBeDefined();
	});

	it('warns when wheel size exceeds 14 inches', () => {
		const config = { ...validConfig, wheel: 20 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'wheel');
		expect(issue).toBeDefined();
	});

	it('warns when rider weight is below 40 kg', () => {
		const config = { ...validConfig, weight: 30 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'weight');
		expect(issue).toBeDefined();
	});

	it('warns when rider weight exceeds 160 kg', () => {
		const config = { ...validConfig, weight: 200 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'weight');
		expect(issue).toBeDefined();
	});

	it('warns when scooterWeight exceeds 65 kg', () => {
		const config = { ...validConfig, scooterWeight: 80 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'scooterWeight');
		expect(issue).toBeDefined();
	});

	it('warns when scooterWeight is below 5 kg', () => {
		const config = { ...validConfig, scooterWeight: 2 };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'scooterWeight');
		expect(issue).toBeDefined();
	});

	it('does not check scooterWeight when undefined', () => {
		const config: ScooterConfig = { ...validConfig, scooterWeight: undefined };
		const result = validateConfig(config);
		const issue = result.issues.find((i) => i.field === 'scooterWeight');
		expect(issue).toBeUndefined();
	});
});

describe('validateConfig — cross-checks', () => {
	describe('batteryWh discrepancy', () => {
		it('passes when claimedWh is not provided', () => {
			const result = validateConfig(validConfig);
			const whIssue = result.issues.find((i) => i.field === 'batteryWh');
			expect(whIssue).toBeUndefined();
		});

		it('passes when claimedWh matches V×Ah within 5%', () => {
			const calcWh = validConfig.v * validConfig.ah; // 52 * 20 = 1040
			const result = validateConfig(validConfig, { batteryWh: calcWh });
			const whIssue = result.issues.find((i) => i.field === 'batteryWh');
			expect(whIssue).toBeUndefined();
		});

		it('warns when claimedWh differs by 6-15%', () => {
			const calcWh = validConfig.v * validConfig.ah; // 1040
			const claimedWh = Math.round(calcWh * 1.1); // 10% over
			const result = validateConfig(validConfig, { batteryWh: claimedWh });
			const whIssue = result.issues.find((i) => i.field === 'batteryWh');
			expect(whIssue).toBeDefined();
			expect(whIssue!.severity).toBe('warning');
		});

		it('errors when claimedWh differs by more than 15%', () => {
			const calcWh = validConfig.v * validConfig.ah; // 1040
			const claimedWh = Math.round(calcWh * 1.2); // 20% over
			const result = validateConfig(validConfig, { batteryWh: claimedWh });
			const whIssue = result.issues.find((i) => i.field === 'batteryWh');
			expect(whIssue).toBeDefined();
			expect(whIssue!.severity).toBe('error');
		});
	});

	describe('powerToWeight ratio', () => {
		it('warns when power-to-weight is below 3 W/kg', () => {
			// totalPower = 200*1 = 200, totalWeight = 80+28 = 108, ratio = 1.85
			const config = { ...validConfig, watts: 200, motors: 1, scooterWeight: 28 };
			const result = validateConfig(config);
			const ptwIssue = result.issues.find((i) => i.field === 'power-to-weight');
			expect(ptwIssue).toBeDefined();
			expect(ptwIssue!.severity).toBe('warning');
		});

		it('errors when power-to-weight exceeds 100 W/kg', () => {
			// totalPower = 8000*2 = 16000, totalWeight = 40+0 = 40, ratio = 400
			const config = { ...validConfig, watts: 8000, motors: 2, weight: 40, scooterWeight: 0 };
			const result = validateConfig(config);
			const ptwIssue = result.issues.find((i) => i.field === 'power-to-weight');
			expect(ptwIssue).toBeDefined();
			expect(ptwIssue!.severity).toBe('error');
		});

		it('passes with normal power-to-weight ratio', () => {
			// totalPower = 500*1 = 500, totalWeight = 80+28 = 108, ratio ~= 4.6 W/kg (above 3, below 100)
			const result = validateConfig(validConfig);
			const ptwIssue = result.issues.find((i) => i.field === 'power-to-weight');
			expect(ptwIssue).toBeUndefined();
		});
	});

	describe('voltagePowerMatch', () => {
		it('warns when low-voltage system (<=36V) claims high power (>2000W)', () => {
			const config = { ...validConfig, v: 36, watts: 1500, motors: 2 }; // 3000W total
			const result = validateConfig(config);
			const vpIssue = result.issues.find((i) => i.field === 'voltage-power');
			expect(vpIssue).toBeDefined();
			expect(vpIssue!.severity).toBe('warning');
		});

		it('warns when high-voltage system (>=60V) claims very low power (<500W)', () => {
			const config = { ...validConfig, v: 72, watts: 200, motors: 2 }; // 400W total
			const result = validateConfig(config);
			const vpIssue = result.issues.find((i) => i.field === 'voltage-power');
			expect(vpIssue).toBeDefined();
			expect(vpIssue!.severity).toBe('warning');
		});

		it('does not warn for normal voltage/power combinations', () => {
			// 52V, 500W total — v is between 36 and 60, so neither low-v/high-power nor high-v/low-power triggers
			const result = validateConfig(validConfig);
			const vpIssue = result.issues.find((i) => i.field === 'voltage-power');
			expect(vpIssue).toBeUndefined();
		});
	});

	describe('C-rate check', () => {
		it('warns when C-rate is between 3.5 and 5', () => {
			// totalPower = 1600W, wh = v*ah
			// cRate = totalPower / wh > 3.5 → wh < 1600/3.5 ≈ 457
			// v=52, ah=8 → wh=416 → cRate = 1600/416 = 3.85
			const config = { ...validConfig, watts: 800, motors: 2, ah: 8 }; // totalPower=1600, wh=416
			const result = validateConfig(config);
			const crIssue = result.issues.find((i) => i.field === 'c-rate');
			expect(crIssue).toBeDefined();
			expect(crIssue!.severity).toBe('warning');
		});

		it('errors when C-rate exceeds 5', () => {
			// totalPower=3200, wh = 52*10 = 520, cRate = 3200/520 ≈ 6.15
			const config = { ...validConfig, watts: 1600, motors: 2, ah: 10 };
			const result = validateConfig(config);
			const crIssue = result.issues.find((i) => i.field === 'c-rate');
			expect(crIssue).toBeDefined();
			expect(crIssue!.severity).toBe('error');
		});

		it('does not flag normal C-rates', () => {
			// 3200W / 832Wh = 3.84... wait, let's recalculate validConfig
			// totalPower = 1600*2 = 3200, wh = 52*16 = 832, cRate = 3.85
			// Hmm, validConfig itself might trigger a warning.
			// Use lower power to be safe
			const config = { ...validConfig, watts: 500, motors: 1 }; // 500W / 832Wh = 0.6C
			const result = validateConfig(config);
			const crIssue = result.issues.find((i) => i.field === 'c-rate');
			expect(crIssue).toBeUndefined();
		});
	});
});

describe('validateConfig — required field checks', () => {
	it('errors when voltage is 0', () => {
		const config = { ...validConfig, v: 0 };
		const result = validateConfig(config);
		expect(result.valid).toBe(false);
		const issue = result.issues.find((i) => i.field === 'v' && i.message === 'Voltage is required');
		expect(issue).toBeDefined();
	});

	it('errors when battery capacity is 0', () => {
		const config = { ...validConfig, ah: 0 };
		const result = validateConfig(config);
		expect(result.valid).toBe(false);
		const issue = result.issues.find((i) => i.field === 'ah' && i.message === 'Battery capacity is required');
		expect(issue).toBeDefined();
	});

	it('errors when motor power is 0', () => {
		const config = { ...validConfig, watts: 0 };
		const result = validateConfig(config);
		expect(result.valid).toBe(false);
		const issue = result.issues.find((i) => i.field === 'watts' && i.message === 'Motor power is required');
		expect(issue).toBeDefined();
	});
});

describe('validateConfig — confidence scoring', () => {
	it('reduces confidence by 20 per error', () => {
		// Trigger one error: voltage = 0
		const config = { ...validConfig, v: 0 };
		const result = validateConfig(config);
		const errors = result.issues.filter((i) => i.severity === 'error').length;
		const warnings = result.issues.filter((i) => i.severity === 'warning').length;
		const expected = Math.max(0, 100 - errors * 20 - warnings * 5);
		expect(result.confidence).toBe(expected);
	});

	it('reduces confidence by 5 per warning', () => {
		// Trigger one warning: voltage slightly low (12V - only a warning, not error since 12 > 24*0.5=12... borderline)
		// Use 13V (between 12 and 24) - warning only
		const config = { ...validConfig, v: 13 }; // 13 > 12 (24*0.5), so warning not error
		const result = validateConfig(config);
		const errors = result.issues.filter((i) => i.severity === 'error').length;
		const warnings = result.issues.filter((i) => i.severity === 'warning').length;
		const expected = Math.max(0, 100 - errors * 20 - warnings * 5);
		expect(result.confidence).toBe(expected);
	});

	it('confidence never goes below 0', () => {
		// Trigger many errors: v=0, ah=0, watts=0
		const config = { ...validConfig, v: 0, ah: 0, watts: 0 };
		const result = validateConfig(config);
		expect(result.confidence).toBeGreaterThanOrEqual(0);
	});

	it('valid field is false when there are errors', () => {
		const config = { ...validConfig, v: 0 };
		const result = validateConfig(config);
		expect(result.valid).toBe(false);
	});

	it('valid field is true when there are only warnings', () => {
		// Trigger only a warning: voltage 13V (warning, not error)
		const config = { ...validConfig, v: 13, watts: 200, motors: 1, scooterWeight: undefined };
		const result = validateConfig(config);
		const errors = result.issues.filter((i) => i.severity === 'error').length;
		expect(errors).toBe(0);
		expect(result.valid).toBe(true);
	});
});

describe('validateConfig — boundary values', () => {
	it('accepts voltage exactly at minimum boundary (24V)', () => {
		const config = { ...validConfig, v: 24 };
		const result = validateConfig(config);
		const vIssue = result.issues.find((i) => i.field === 'v' && i.message.includes('outside expected range'));
		expect(vIssue).toBeUndefined();
	});

	it('accepts voltage exactly at maximum boundary (100V)', () => {
		const config = { ...validConfig, v: 100 };
		const result = validateConfig(config);
		const vIssue = result.issues.find((i) => i.field === 'v' && i.message.includes('outside expected range'));
		expect(vIssue).toBeUndefined();
	});

	it('accepts wheel size exactly at minimum boundary (5 inches)', () => {
		const config = { ...validConfig, wheel: 5 };
		const result = validateConfig(config);
		const wIssue = result.issues.find((i) => i.field === 'wheel' && i.message.includes('outside expected range'));
		expect(wIssue).toBeUndefined();
	});

	it('accepts rider weight exactly at boundaries', () => {
		const configMin = { ...validConfig, weight: 40 };
		const configMax = { ...validConfig, weight: 160 };
		expect(validateConfig(configMin).issues.find((i) => i.field === 'weight')).toBeUndefined();
		expect(validateConfig(configMax).issues.find((i) => i.field === 'weight')).toBeUndefined();
	});
});
