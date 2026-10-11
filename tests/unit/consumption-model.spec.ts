import { describe, it, expect } from 'vitest';
import { calculatePerformance, physicsWhPerKm } from '$lib/physics/calculator';
import { calculateUpgradeDelta } from '$lib/physics/upgrades';
import { calibrateStyle, claimConditions } from '$lib/physics/calibration';
import { presets, presetMetadata } from '$lib/data/presets';
import { rideModePresets } from '$lib/data/ride-modes';
import type { ScooterConfig } from '$lib/types';

const commuter: ScooterConfig = { ...presets.navee_gt3 };
const hyper: ScooterConfig = { ...presets.wolf_king_gtr };
const range = (c: ScooterConfig, mode: 'spec' | 'realworld' = 'spec') => calculatePerformance(c, mode).totalRange;

describe('consumption model: range responds to the ride', () => {
	for (const [name, base] of [
		['commuter', commuter],
		['hyperscooter', hyper],
	] as const) {
		describe(name, () => {
			it('heavier riders get less range', () => {
				expect(range({ ...base, weight: 120 })).toBeLessThan(range({ ...base, weight: 80 }));
				expect(range({ ...base, weight: 60 })).toBeGreaterThan(range({ ...base, weight: 80 }));
			});

			it('hills reduce range (they used to increase it)', () => {
				expect(range({ ...base, slope: 4 })).toBeLessThan(range({ ...base, slope: 0 }));
				expect(range({ ...base, slope: 8 })).toBeLessThan(range({ ...base, slope: 4 }));
			});

			it('regen helps more on hills than on the flat', () => {
				const flatGain = range({ ...base, slope: 0, regen: 0.15 }) / range({ ...base, slope: 0, regen: 0 });
				const hillGain = range({ ...base, slope: 8, regen: 0.15 }) / range({ ...base, slope: 8, regen: 0 });
				expect(flatGain).toBeGreaterThan(1);
				expect(flatGain).toBeLessThan(1.05); // measured regen gains are 1–5%
				expect(hillGain).toBeGreaterThan(flatGain);
			});

			it('lower rolling resistance increases range', () => {
				expect(range({ ...base, rollingResistance: 0.012 })).toBeGreaterThan(
					range({ ...base, rollingResistance: 0.02 })
				);
			});

			it('real-world mode never shows more range than spec', () => {
				expect(range(base, 'realworld')).toBeLessThan(range(base, 'spec'));
			});
		});
	}

	it('tyre upgrade now shows a real range gain', () => {
		expect(calculateUpgradeDelta({ ...commuter, rollingResistance: 0.02 }, 'tires').rangePercent).toBeGreaterThan(0);
	});

	it('preset base consumption equals actual consumption at reference conditions', () => {
		// 80 kg, flat, no regen, full power: Wh/km should equal `style`.
		const ref = { ...commuter, weight: 80, slope: 0, regen: 0 };
		const s = calculatePerformance(ref);
		expect(s.wh / s.totalRange).toBeCloseTo(ref.style, 6);
	});
});

describe('physicsWhPerKm', () => {
	const inputs = {
		CdA: 0.5,
		riderMass: 80,
		scooterMass: 20,
		rollingResistance: 0.015,
		drivetrainEfficiency: 0.9,
		motors: 1,
		ratedWatts: 500,
		slopePercent: 0,
		regen: 0,
		cruiseKmh: 20,
	};

	it('has correct units on the flat (N·km → Wh: ÷3.6)', () => {
		const v = 20 / 3.6;
		const force = 0.015 * 100 * 9.81 + 0.5 * 1.225 * 0.5 * v * v;
		const idle = (5 + 0.01 * 500) / 20;
		expect(physicsWhPerKm(inputs)).toBeCloseTo(force / 0.9 / 3.6 + idle, 9);
	});

	it('a gentle out-and-back grade costs little; a steep one costs a lot', () => {
		const flat = physicsWhPerKm(inputs);
		expect(physicsWhPerKm({ ...inputs, slopePercent: 1 }) / flat).toBeLessThan(1.05);
		expect(physicsWhPerKm({ ...inputs, slopePercent: 8 }) / flat).toBeGreaterThan(1.3);
	});
});

describe('speed cap and ride modes', () => {
	it('firmware speed cap limits top speed', () => {
		const air5 = presets.pure_electric_air5;
		expect(calculatePerformance(air5).speed).toBeLessThanOrEqual(25 + 1e-9);
		expect(calculatePerformance({ ...air5, speedCap: undefined }).speed).toBeGreaterThan(25);
	});

	it('ride modes scale relative to the scooter, and Eco extends range', () => {
		for (const base of [commuter, hyper]) {
			const full = calculatePerformance(base);
			const eco = calculatePerformance({
				...base,
				speedFactor: rideModePresets.eco.speedFactor,
				powerLimit: rideModePresets.eco.powerLimit,
			});
			expect(eco.speed).toBeLessThanOrEqual(full.speed * rideModePresets.eco.speedFactor + 1e-9);
			expect(eco.totalWatts).toBeCloseTo(full.totalWatts * rideModePresets.eco.powerLimit, 6);
			expect(eco.totalRange).toBeGreaterThan(full.totalRange);
		}
	});
});

describe('calibration', () => {
	it('reproduces the claimed range under claim conditions', () => {
		const claim = presetMetadata.navee_gt3.manufacturer.range;
		const style = calibrateStyle(commuter, claim);
		const atClaim = calculatePerformance({ ...claimConditions(commuter), style }).totalRange;
		expect(atClaim).toBeCloseTo(claim, 6);
	});

	it('everyday range is below the claim (claims assume a light rider at low speed)', () => {
		for (const key of ['navee_gt3', 'apollo_phantom_v3', 'wolf_king_gtr', 'inmotion_climber']) {
			const claim = presetMetadata[key].manufacturer.range;
			expect(range(presets[key])).toBeLessThan(claim);
			expect(range(presets[key])).toBeGreaterThan(claim * 0.4);
		}
	});

	it('stays within ~25% of independent range tests', () => {
		// ERideHero / ESG regular-riding tests (km).
		const tested: Record<string, number> = {
			navee_gt3: 37.5,
			apollo_phantom_v3: 52,
			wolf_king_gtr: 73,
			inmotion_climber: 39.7,
		};
		for (const [key, km] of Object.entries(tested)) {
			const ratio = range(presets[key]) / km;
			expect(ratio, key).toBeGreaterThan(0.75);
			expect(ratio, key).toBeLessThan(1.25);
		}
	});
});
