import { describe, it, expect } from 'vitest';
import { formatPercentChange, formatSignedDelta } from '$lib/utils/formatters';
import { calculatePerformance } from '$lib/physics/calculator';
import { generateRecommendations } from '$lib/physics/recommendations';
import { getAllUpgrades } from '$lib/physics/upgrades';
import { presets } from '$lib/data/presets';
import { CHARGE_WALL_EFFICIENCY } from '$lib/constants/physics';
import { calculatorState, configKeys, loadPreset, applyRideMode, updateConfig } from '$lib/stores/calculator.svelte';
import type { PerformanceStats } from '$lib/types';

describe('formatPercentChange', () => {
	it('formats signed changes', () => {
		expect(formatPercentChange(100, 112)).toBe('+12%');
		expect(formatPercentChange(100, 95)).toBe('-5%');
		expect(formatPercentChange(100, 100)).toBe('+0%');
		expect(formatPercentChange(100, 99.9)).toBe('+0%'); // no "-0%"
	});

	it('returns n/a instead of NaN/Infinity', () => {
		expect(formatPercentChange(0, 10)).toBe('n/a');
		expect(formatPercentChange(0, 0)).toBe('n/a');
		expect(formatPercentChange(-5, 10)).toBe('n/a');
		expect(formatPercentChange(10, NaN)).toBe('n/a');
		expect(formatPercentChange(NaN, 10)).toBe('n/a');
	});
});

describe('formatSignedDelta', () => {
	it('formats signed differences', () => {
		expect(formatSignedDelta(40, 47)).toBe('+7');
		expect(formatSignedDelta(40, 37)).toBe('-3');
		expect(formatSignedDelta(40, NaN)).toBe('n/a');
	});
});

describe('calculatePerformance input guard', () => {
	const base = presets.custom;
	it.each([
		['soh 0', { soh: 0 }],
		['NaN voltage', { v: NaN }],
		['undefined weight', { weight: undefined as unknown as number }],
		['zero motors', { motors: 0 }],
		['zero watts', { watts: 0 }],
		['zero wheel', { wheel: 0 }],
		['NaN temperature', { ambientTemp: NaN }],
	])('returns zero stats for %s', (_label, override) => {
		const stats = calculatePerformance({ ...base, ...override });
		for (const value of Object.values(stats)) {
			expect(Number.isFinite(value)).toBe(true);
		}
		expect(stats.totalRange).toBe(0);
	});
});

describe('recommendation and upgrade text never shows NaN/Infinity', () => {
	const zero: PerformanceStats = {
		wh: 0,
		totalRange: 0,
		speed: 0,
		hillSpeed: 0,
		totalWatts: 0,
		chargeTime: 0,
		costPer100km: 0,
		accelScore: 0,
		amps: 0,
		cRate: 0,
	};
	it('with zero baseline stats', () => {
		const config = { ...presets.custom, controller: 10 };
		const text = JSON.stringify([generateRecommendations(config, zero, zero), getAllUpgrades(config, zero, zero)]);
		expect(text).not.toMatch(/NaN|Infinity|\+-/);
	});
});

describe('cost includes charging losses', () => {
	it('costPer100km uses wall energy', () => {
		const config = { ...presets.custom, cost: 0.2 };
		const s = calculatePerformance(config);
		const batteryOnly = (100 / s.totalRange) * (s.wh / 1000) * 0.2;
		expect(s.costPer100km).toBeCloseTo(batteryOnly / CHARGE_WALL_EFFICIENCY, 6);
	});
});

describe('share link keys', () => {
	it('are append-only (existing positions unchanged) and include rpm', () => {
		expect(configKeys.slice(0, 3)).toEqual(['v', 'ah', 'motors']);
		expect(configKeys[21]).toBe('rollingResistance');
		expect(configKeys).toContain('rpm');
		expect(configKeys.indexOf('rpm')).toBeGreaterThan(21);
	});
});

describe('store ride mode state', () => {
	it('is null after loading a preset that matches no mode', () => {
		loadPreset('segway_gt3_pro');
		expect(calculatorState.rideMode).toBeNull();
	});

	it('tracks the applied mode and clears when style is edited', () => {
		applyRideMode('eco');
		expect(calculatorState.rideMode).toBe('eco');
		updateConfig('style', 33);
		expect(calculatorState.rideMode).toBeNull();
	});

	it('derived stats track config changes', () => {
		loadPreset('custom');
		const before = calculatorState.stats.totalRange;
		updateConfig('ah', calculatorState.config.ah * 2);
		expect(calculatorState.stats.totalRange).toBeGreaterThan(before);
	});
});
