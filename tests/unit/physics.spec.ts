import { describe, it, expect } from 'vitest';
import {
	calculatePerformance,
	calculateTemperatureFactor,
	detectBottlenecks,
	generateRecommendations,
	simulateUpgrade,
	calculateUpgradeDelta,
} from '$lib/physics';
import type { ScooterConfig } from '$lib/types';

const defaultConfig: ScooterConfig = {
	v: 52,
	ah: 16,
	motors: 2,
	watts: 1600,
	style: 30,
	weight: 80,
	wheel: 10,
	charger: 3,
	regen: 0.05,
	cost: 0.2,
	slope: 0,
	ridePosition: 0.6,
	soh: 1,
	ambientTemp: 20,
};

describe('Physics Calculations', () => {
	it('calculates basic performance metrics', () => {
		const result = calculatePerformance(defaultConfig, 'spec');

		expect(result.wh).toBeGreaterThan(0);
		expect(result.totalRange).toBeGreaterThan(0);
		expect(result.speed).toBeGreaterThan(0);
		expect(result.totalWatts).toBeCloseTo(2944, 0);
	});

	it('returns consistent results for repeated calls', () => {
		const first = calculatePerformance(defaultConfig, 'spec');
		const second = calculatePerformance(defaultConfig, 'spec');

		expect(second).toEqual(first);
	});

	it('applies battery health correctly', () => {
		const config = { ...defaultConfig, soh: 0.8 };
		const result = calculatePerformance(config);

		expect(result.wh).toBe(defaultConfig.v * defaultConfig.ah * 0.8);
	});

	it('calculates hill climb speed', () => {
		const config = { ...defaultConfig, slope: 10 };
		const result = calculatePerformance(config);

		expect(result.hillSpeed).toBeLessThan(result.speed);
		expect(result.hillSpeed).toBeGreaterThan(0);
	});

	it('applies drag coefficient for different riding positions', () => {
		const uprightConfig = { ...defaultConfig, ridePosition: 0.6 };
		const tuckConfig = { ...defaultConfig, ridePosition: 0.4 };

		const uprightResult = calculatePerformance(uprightConfig);
		const tuckResult = calculatePerformance(tuckConfig);

		expect(tuckResult.speed).toBeGreaterThan(uprightResult.speed);
	});

	it('calculates acceleration score based on power-to-weight', () => {
		const lightConfig = { ...defaultConfig, weight: 60 };
		const heavyConfig = { ...defaultConfig, weight: 120 };

		const lightResult = calculatePerformance(lightConfig);
		const heavyResult = calculatePerformance(heavyConfig);

		expect(lightResult.accelScore).toBeGreaterThan(heavyResult.accelScore);
	});

	it('calculates C-rate correctly', () => {
		const result = calculatePerformance(defaultConfig);

		expect(result.cRate).toBe(result.amps / defaultConfig.ah);
		expect(result.cRate).toBeGreaterThan(0);
	});

	it('handles steep hills without NaN values', () => {
		const steepConfig: ScooterConfig = {
			...defaultConfig,
			slope: 25,
			weight: 110,
		};
		const result = calculatePerformance(steepConfig);

		expect(Number.isFinite(result.hillSpeed)).toBe(true);
		expect(result.hillSpeed).toBeLessThan(result.speed);
	});

	it('reduces top speed with lower voltage', () => {
		const lowVoltageConfig: ScooterConfig = {
			...defaultConfig,
			v: 36,
		};
		const baseResult = calculatePerformance(defaultConfig, 'spec');
		const lowResult = calculatePerformance(lowVoltageConfig, 'spec');

		expect(lowResult.speed).toBeLessThan(baseResult.speed);
	});

	describe('Prediction Modes', () => {
		it('both prediction modes return valid results', () => {
			const specResult = calculatePerformance(defaultConfig, 'spec');
			const realworldResult = calculatePerformance(defaultConfig, 'realworld');

			expect(specResult.totalRange).toBeGreaterThan(0);
			expect(realworldResult.totalRange).toBeGreaterThan(0);
			expect(specResult.speed).toBeGreaterThan(0);
			expect(realworldResult.speed).toBeGreaterThan(0);
		});

		it('applies drivetrain efficiency correctly', () => {
			const configWithEfficiency: ScooterConfig = {
				...defaultConfig,
				drivetrainEfficiency: 0.85,
			};

			const result = calculatePerformance(configWithEfficiency, 'spec');
			expect(result.speed).toBeGreaterThan(0);
		});

		it('applies battery sag correctly', () => {
			const configWithSag: ScooterConfig = {
				...defaultConfig,
				batterySagPercent: 0.15,
			};

			const result = calculatePerformance(configWithSag, 'spec');
			expect(result.speed).toBeGreaterThan(0);
		});
	});
});

describe('Recommendation Engine', () => {
	it('generates parallel battery recommendation for high C-rate', () => {
		const configWithHighCrate: ScooterConfig = {
			...defaultConfig,
			ah: 10,
			watts: 2000,
		};

		const specStats = calculatePerformance(configWithHighCrate, 'spec');
		const realworldStats = calculatePerformance(configWithHighCrate, 'realworld');
		const recommendations = generateRecommendations(configWithHighCrate, specStats, realworldStats);

		expect(recommendations.some((r) => r.upgradeType === 'parallel')).toBe(true);
	});

	it('generates voltage recommendation for low speed', () => {
		const configWithLowVoltage: ScooterConfig = {
			...defaultConfig,
			v: 36,
			watts: 500,
		};

		const specStats = calculatePerformance(configWithLowVoltage, 'spec');
		const realworldStats = calculatePerformance(configWithLowVoltage, 'realworld');
		const recommendations = generateRecommendations(configWithLowVoltage, specStats, realworldStats);

		expect(recommendations.some((r) => r.upgradeType === 'voltage')).toBe(true);
	});

	it('generates controller recommendation when limited', () => {
		const configWithController: ScooterConfig = {
			...defaultConfig,
			controller: 40,
			watts: 2000,
		};

		const specStats = calculatePerformance(configWithController, 'spec');
		const realworldStats = calculatePerformance(configWithController, 'realworld');
		const recommendations = generateRecommendations(configWithController, specStats, realworldStats);

		expect(recommendations.some((r) => r.upgradeType === 'controller')).toBe(true);
	});
});

describe('Upgrade Simulation', () => {
	it('simulates parallel battery upgrade', () => {
		const upgraded = simulateUpgrade(defaultConfig, 'parallel');

		expect(upgraded.ah).toBe(defaultConfig.ah * 2);
		expect(upgraded.v).toBe(defaultConfig.v);
	});

	it('simulates voltage upgrade', () => {
		const upgraded = simulateUpgrade(defaultConfig, 'voltage');

		expect(upgraded.v).toBeGreaterThan(defaultConfig.v);
	});

	it('calculates upgrade delta correctly', () => {
		const delta = calculateUpgradeDelta(defaultConfig, 'parallel');

		expect(delta).not.toBeNull();
		expect(delta.rangeChange).toBeGreaterThan(0);
		expect(delta.rangePercent).toBeGreaterThan(0);
	});
});

describe('Bottleneck Detection', () => {
	it('detects high C-rate bottleneck', () => {
		const config: ScooterConfig = {
			v: 36,
			ah: 10,
			motors: 2,
			watts: 3000,
			style: 30,
			weight: 80,
			wheel: 10,
			charger: 3,
			regen: 0.05,
			cost: 0.2,
			slope: 0,
			ridePosition: 0.6,
			soh: 1,
			ambientTemp: 20,
		};

		const stats = calculatePerformance(config);
		const bottlenecks = detectBottlenecks(stats, config);

		expect(bottlenecks.some((b) => b.type === 'SAG_WARNING')).toBe(true);
	});

	it('detects controller limit bottleneck', () => {
		const config: ScooterConfig = {
			v: 52,
			ah: 16,
			motors: 2,
			watts: 2000,
			style: 30,
			weight: 80,
			wheel: 10,
			charger: 3,
			regen: 0.05,
			cost: 0.2,
			slope: 0,
			ridePosition: 0.6,
			soh: 1,
			controller: 50,
			ambientTemp: 20,
		};

		const stats = calculatePerformance(config);
		const bottlenecks = detectBottlenecks(stats, config);

		expect(bottlenecks.some((b) => b.type === 'CONTROLLER_LIMIT')).toBe(true);
	});

	it('detects hill climb bottleneck', () => {
		const config: ScooterConfig = {
			v: 36,
			ah: 10,
			motors: 1,
			watts: 500,
			style: 30,
			weight: 100,
			wheel: 8,
			charger: 2,
			regen: 0.05,
			cost: 0.2,
			slope: 15,
			ridePosition: 0.6,
			soh: 1,
			ambientTemp: 20,
		};

		const stats = calculatePerformance(config);
		const bottlenecks = detectBottlenecks(stats, config);

		expect(bottlenecks.some((b) => b.type === 'HILL_CLIMB_LIMIT')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// calculateTemperatureFactor — full branch coverage including the >45 °C path
// ---------------------------------------------------------------------------
describe('calculateTemperatureFactor', () => {
	// ── Cold side ──────────────────────────────────────────────────────────────
	it('returns 0.6 at the lower bound (-20 °C)', () => {
		expect(calculateTemperatureFactor(-20)).toBe(0.6);
	});

	it('returns 0.6 for temperatures below -20 °C (clamps)', () => {
		expect(calculateTemperatureFactor(-40)).toBe(0.6);
		expect(calculateTemperatureFactor(-100)).toBe(0.6);
	});

	it('returns 0.8 at 0 °C (midpoint of cold interpolation)', () => {
		// normalizedTemp = (0 + 20) / 40 = 0.5 → 0.6 + 0.5 * 0.4 = 0.8
		expect(calculateTemperatureFactor(0)).toBeCloseTo(0.8, 10);
	});

	it('returns 1.0 at 20 °C (lower edge of optimal band)', () => {
		expect(calculateTemperatureFactor(20)).toBe(1.0);
	});

	// ── Optimal band ───────────────────────────────────────────────────────────
	it('returns 1.0 throughout the optimal band (20–45 °C)', () => {
		expect(calculateTemperatureFactor(25)).toBe(1.0);
		expect(calculateTemperatureFactor(35)).toBe(1.0);
		expect(calculateTemperatureFactor(45)).toBe(1.0);
	});

	// ── Hot side (the new >45 °C branch — previously untested) ────────────────
	it('begins degrading just above 45 °C', () => {
		const factor = calculateTemperatureFactor(46);
		expect(factor).toBeLessThan(1.0);
		expect(factor).toBeGreaterThan(0.93);
	});

	it('returns the correct interpolated value at 52.5 °C (midpoint of hot ramp)', () => {
		// normalizedTemp = (52.5 - 45) / 15 = 0.5 → 1.0 - 0.5 * 0.07 = 0.965
		expect(calculateTemperatureFactor(52.5)).toBeCloseTo(0.965, 5);
	});

	it('returns 0.93 at exactly 60 °C (upper bound of hot ramp)', () => {
		expect(calculateTemperatureFactor(60)).toBeCloseTo(0.93, 10);
	});

	it('clamps to 0.93 above 60 °C', () => {
		expect(calculateTemperatureFactor(61)).toBe(0.93);
		expect(calculateTemperatureFactor(100)).toBe(0.93);
	});

	it('hot-side factor is always between 0.93 and 1.0 for temperatures 45–60 °C', () => {
		for (let t = 45; t <= 60; t += 2.5) {
			const f = calculateTemperatureFactor(t);
			expect(f).toBeGreaterThanOrEqual(0.93);
			expect(f).toBeLessThanOrEqual(1.0);
		}
	});
});

// ---------------------------------------------------------------------------
// calculatePerformance — guard cases and ZERO_STATS
// ---------------------------------------------------------------------------
describe('calculatePerformance – guard cases', () => {
	const baseConfig: ScooterConfig = {
		v: 52,
		ah: 16,
		motors: 2,
		watts: 1600,
		style: 30,
		weight: 80,
		wheel: 10,
		charger: 3,
		regen: 0.05,
		cost: 0.2,
		slope: 0,
		ridePosition: 0.6,
		soh: 1,
		ambientTemp: 20,
	};

	it('returns all-zero stats when voltage is zero', () => {
		const result = calculatePerformance({ ...baseConfig, v: 0 });
		expect(result.wh).toBe(0);
		expect(result.totalRange).toBe(0);
		expect(result.speed).toBe(0);
		expect(result.cRate).toBe(0);
		expect(result.accelScore).toBe(0);
	});

	it('returns all-zero stats when voltage is negative', () => {
		const result = calculatePerformance({ ...baseConfig, v: -10 });
		expect(result.wh).toBe(0);
		expect(result.totalRange).toBe(0);
	});

	it('returns all-zero stats when capacity is zero', () => {
		const result = calculatePerformance({ ...baseConfig, ah: 0 });
		expect(result.wh).toBe(0);
		expect(result.totalRange).toBe(0);
	});

	it('returns all-zero stats when style (Wh/km) is zero', () => {
		const result = calculatePerformance({ ...baseConfig, style: 0 });
		expect(result.wh).toBe(0);
		expect(result.totalRange).toBe(0);
	});

	it('returns all-zero stats when rider weight is zero', () => {
		const result = calculatePerformance({ ...baseConfig, weight: 0 });
		expect(result.wh).toBe(0);
		expect(result.totalRange).toBe(0);
	});

	it('returned ZERO_STATS object is immutable (frozen)', () => {
		const result = calculatePerformance({ ...baseConfig, v: 0 });
		// Attempting to mutate a frozen object silently fails in non-strict mode
		// and throws in strict mode. Either way the value must not change.
		try {
			(result as { wh: number }).wh = 999;
		} catch {
			/* strict mode */
		}
		expect(result.wh).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// calculatePerformance — cRate uses effectiveAh (SoH + temperature adjusted)
// ---------------------------------------------------------------------------
describe('calculatePerformance – cRate uses effectiveAh', () => {
	const baseConfig: ScooterConfig = {
		v: 52,
		ah: 20,
		motors: 1,
		watts: 1000,
		style: 25,
		weight: 75,
		wheel: 10,
		charger: 3,
		regen: 0,
		cost: 0.2,
		slope: 0,
		ridePosition: 0.5,
		soh: 1.0,
		ambientTemp: 20,
		batterySagPercent: 0.08,
		drivetrainEfficiency: 0.9,
	};

	it('cRate equals amps / (ah * soh * tempFactor) not amps / raw ah', () => {
		const soh = 0.8;
		const config = { ...baseConfig, soh };
		const result = calculatePerformance(config, 'spec');
		const tempFactor = calculateTemperatureFactor(config.ambientTemp); // 1.0 at 20°C
		const effectiveAh = config.ah * soh * tempFactor;
		expect(result.cRate).toBeCloseTo(result.amps / effectiveAh, 5);
	});

	it('cRate is higher when SoH is reduced (same amps, fewer effective Ah)', () => {
		const healthyResult = calculatePerformance({ ...baseConfig, soh: 1.0 }, 'spec');
		const degradedResult = calculatePerformance({ ...baseConfig, soh: 0.7 }, 'spec');
		// Degraded battery has lower effectiveAh → higher C-rate stress
		expect(degradedResult.cRate).toBeGreaterThan(healthyResult.cRate);
	});

	it('cRate formula: temperature cancels in cRate because both totalWatts and effectiveAh scale equally', () => {
		// Both totalWatts and effectiveAh are multiplied by the same temperatureFactor.
		// amps = totalWatts / effectiveVoltage  (effectiveVoltage is NOT temp-dependent)
		// cRate = amps / effectiveAh = (totalWatts * tempFactor) / effectiveVoltage / (ah * soh * tempFactor)
		// The tempFactor cancels → cRate is independent of temperature alone.
		const coolResult = calculatePerformance({ ...baseConfig, ambientTemp: 20 }, 'spec');
		const hotResult = calculatePerformance({ ...baseConfig, ambientTemp: 60 }, 'spec');
		expect(hotResult.cRate).toBeCloseTo(coolResult.cRate, 5);
	});
});
