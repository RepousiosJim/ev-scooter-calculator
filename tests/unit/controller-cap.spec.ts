import { describe, it, expect } from 'vitest';
import { calculatePerformance } from '$lib/physics/calculator';
import { detectBottlenecks } from '$lib/physics/bottlenecks';
import { generateRecommendations } from '$lib/physics/recommendations';
import { calculateUpgradeDelta } from '$lib/physics/upgrades';
import { presets } from '$lib/data/presets';

const base = { ...presets.custom, controller: undefined };

describe('controller current limit', () => {
	it('does not change power when absent or generous', () => {
		const free = calculatePerformance(base);
		const generous = calculatePerformance({ ...base, controller: 500 });
		expect(free.controllerLimited).toBe(false);
		expect(generous.controllerLimited).toBe(false);
		expect(generous.totalWatts).toBeCloseTo(free.totalWatts, 6);
	});

	it('caps power at amps × sagged voltage × drivetrain efficiency', () => {
		const config = { ...base, controller: 10 };
		const s = calculatePerformance(config, 'spec');
		const sag = Math.max(config.batterySagPercent ?? 0.08, 0);
		const expected = 10 * config.v * (1 - sag) * (config.drivetrainEfficiency ?? 0.9);
		expect(s.controllerLimited).toBe(true);
		expect(s.totalWatts).toBeCloseTo(expected, 6);
		expect(s.uncappedWatts!).toBeGreaterThan(s.totalWatts);
	});

	it('lowers speed and acceleration when it binds', () => {
		const free = calculatePerformance(base);
		const capped = calculatePerformance({ ...base, controller: 10 });
		expect(capped.accelScore).toBeLessThan(free.accelScore);
		expect(capped.speed).toBeLessThanOrEqual(free.speed);
	});

	it('bottleneck, recommendation and upgrade delta agree', () => {
		const config = { ...base, controller: 10 };
		const spec = calculatePerformance(config, 'spec');
		const rw = calculatePerformance(config, 'realworld');
		expect(detectBottlenecks(spec, config).map((b) => b.type)).toContain('CONTROLLER_LIMIT');
		const rec = generateRecommendations(config, spec, rw).find((r) => r.upgradeType === 'controller');
		expect(rec).toBeDefined();
		expect(rec!.expectedGains.spec).toMatch(/^\+\d+% power output/);
		expect(calculateUpgradeDelta(config, 'controller').powerPercent).toBeGreaterThan(0);
	});

	it('is not reported when the controller does not bind', () => {
		const config = { ...base, controller: 500 };
		const spec = calculatePerformance(config, 'spec');
		const rw = calculatePerformance(config, 'realworld');
		expect(detectBottlenecks(spec, config).map((b) => b.type)).not.toContain('CONTROLLER_LIMIT');
		expect(generateRecommendations(config, spec, rw).some((r) => r.upgradeType === 'controller')).toBe(false);
	});
});

describe('KV top speed', () => {
	it('scales with sagged voltage, not drivetrain efficiency', () => {
		// Light load so the KV limit (not power) sets top speed.
		const config = { ...base, motorKv: 10, watts: 5000, drivetrainEfficiency: 0.6, batterySagPercent: 0.1 };
		const lowEff = calculatePerformance(config, 'spec').speed;
		const highEff = calculatePerformance({ ...config, drivetrainEfficiency: 0.95 }, 'spec').speed;
		expect(lowEff).toBeCloseTo(highEff, 6);
		const moreSag = calculatePerformance({ ...config, batterySagPercent: 0.2 }, 'spec').speed;
		expect(moreSag).toBeLessThan(lowEff);
	});
});
