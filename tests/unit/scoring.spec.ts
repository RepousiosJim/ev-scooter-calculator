import { describe, it, expect } from 'vitest';
import { computeScoreBreakdown, computeScore, getGrade, getGradeInfo } from '$lib/utils/scoring';
import type { ScooterConfig, PerformanceStats } from '$lib/types';

// A representative valid config
const baseConfig: ScooterConfig = {
	v: 52,
	ah: 16,
	motors: 2,
	watts: 1600,
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

const baseStats: PerformanceStats = {
	wh: 832,
	totalRange: 80,
	speed: 65,
	hillSpeed: 40,
	totalWatts: 3200,
	chargeTime: 5.3,
	costPer100km: 2.0,
	accelScore: 70,
	amps: 30,
	cRate: 1.2,
};

describe('computeScoreBreakdown', () => {
	it('returns all required fields', () => {
		const bd = computeScoreBreakdown(baseConfig, baseStats);
		expect(bd).toHaveProperty('total');
		expect(bd).toHaveProperty('accel');
		expect(bd).toHaveProperty('range');
		expect(bd).toHaveProperty('speed');
		expect(bd).toHaveProperty('efficiency');
		expect(bd).toHaveProperty('strainPenalty');
		expect(bd).toHaveProperty('weightPenalty');
	});

	it('total is clamped between 0 and 100', () => {
		const bd = computeScoreBreakdown(baseConfig, baseStats);
		expect(bd.total).toBeGreaterThanOrEqual(0);
		expect(bd.total).toBeLessThanOrEqual(100);
	});

	it('accel score uses sqrt scaling (max 30)', () => {
		// accelScore=100 → accel = sqrt(1) * 30 = 30
		const stats = { ...baseStats, accelScore: 100 };
		const bd = computeScoreBreakdown(baseConfig, stats);
		expect(bd.accel).toBeCloseTo(30, 1);
	});

	it('range score uses sqrt scaling capped at 200 km (max 25)', () => {
		// totalRange=200 → range = sqrt(1) * 25 = 25
		const stats = { ...baseStats, totalRange: 200 };
		const bd = computeScoreBreakdown(baseConfig, stats);
		expect(bd.range).toBeCloseTo(25, 1);

		// range > 200 should also give 25 (capped)
		const statsHigh = { ...baseStats, totalRange: 500 };
		const bdHigh = computeScoreBreakdown(baseConfig, statsHigh);
		expect(bdHigh.range).toBeCloseTo(25, 1);
	});

	it('speed score uses sqrt scaling capped at 120 km/h (max 20)', () => {
		const stats = { ...baseStats, speed: 120 };
		const bd = computeScoreBreakdown(baseConfig, stats);
		expect(bd.speed).toBeCloseTo(20, 1);

		const statsHigh = { ...baseStats, speed: 200 };
		const bdHigh = computeScoreBreakdown(baseConfig, statsHigh);
		expect(bdHigh.speed).toBeCloseTo(20, 1);
	});

	it('efficiency is 0 when style >= 35', () => {
		const config = { ...baseConfig, style: 35 };
		const bd = computeScoreBreakdown(config, baseStats);
		expect(bd.efficiency).toBe(0);
	});

	it('efficiency is max 15 when style = 0', () => {
		const config = { ...baseConfig, style: 0 };
		const bd = computeScoreBreakdown(config, baseStats);
		expect(bd.efficiency).toBeCloseTo(15, 1);
	});

	it('strainPenalty is 0 when cRate <= 1.5', () => {
		const stats = { ...baseStats, cRate: 1.5 };
		const bd = computeScoreBreakdown(baseConfig, stats);
		expect(bd.strainPenalty).toBe(0);
	});

	it('strainPenalty grows when cRate > 1.5', () => {
		const stats = { ...baseStats, cRate: 3.0 };
		const bd = computeScoreBreakdown(baseConfig, stats);
		// (3.0 - 1.5) * 8 = 12
		expect(bd.strainPenalty).toBeCloseTo(12, 1);
	});

	it('weightPenalty is 0 when scooterWeight <= 25 kg', () => {
		const config = { ...baseConfig, scooterWeight: 25 };
		const bd = computeScoreBreakdown(config, baseStats);
		expect(bd.weightPenalty).toBe(0);
	});

	it('weightPenalty uses default of 30 when scooterWeight is undefined', () => {
		const config: ScooterConfig = { ...baseConfig, scooterWeight: undefined };
		const bd = computeScoreBreakdown(config, baseStats);
		// (30 - 25) / 100 * 5 = 0.25
		expect(bd.weightPenalty).toBeCloseTo(0.3, 1);
	});

	it('total is 0 when all positive components are zero', () => {
		const zeroStats: PerformanceStats = {
			...baseStats,
			accelScore: 0,
			totalRange: 0,
			speed: 0,
			cRate: 10,
		};
		const config = { ...baseConfig, style: 35 };
		const bd = computeScoreBreakdown(config, zeroStats);
		expect(bd.total).toBe(0);
	});

	it('all numeric fields are rounded to 1 decimal place', () => {
		const bd = computeScoreBreakdown(baseConfig, baseStats);
		const checkDecimal = (n: number) => {
			const _decimal = n - Math.floor(n);
			// Rounded to 1dp means (n * 10) % 1 === 0
			expect(Math.round(n * 10) / 10).toBe(n);
		};
		checkDecimal(bd.accel);
		checkDecimal(bd.range);
		checkDecimal(bd.speed);
		checkDecimal(bd.efficiency);
		checkDecimal(bd.strainPenalty);
		checkDecimal(bd.weightPenalty);
	});
});

describe('computeScore', () => {
	it('returns the same value as breakdown.total', () => {
		const bd = computeScoreBreakdown(baseConfig, baseStats);
		const score = computeScore(baseConfig, baseStats);
		expect(score).toBe(bd.total);
	});

	it('returns a number between 0 and 100', () => {
		const score = computeScore(baseConfig, baseStats);
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(100);
	});

	it('returns 0 for pathological inputs', () => {
		const config = { ...baseConfig, style: 35, scooterWeight: 65 };
		const stats: PerformanceStats = {
			...baseStats,
			accelScore: 0,
			totalRange: 0,
			speed: 0,
			cRate: 20,
		};
		expect(computeScore(config, stats)).toBe(0);
	});
});

describe('getGrade', () => {
	it('returns S for score >= 85', () => {
		expect(getGrade(85)).toBe('S');
		expect(getGrade(100)).toBe('S');
		expect(getGrade(90)).toBe('S');
	});

	it('returns A for score 72-84', () => {
		expect(getGrade(72)).toBe('A');
		expect(getGrade(80)).toBe('A');
		expect(getGrade(84)).toBe('A');
	});

	it('returns B for score 58-71', () => {
		expect(getGrade(58)).toBe('B');
		expect(getGrade(65)).toBe('B');
		expect(getGrade(71)).toBe('B');
	});

	it('returns C for score 44-57', () => {
		expect(getGrade(44)).toBe('C');
		expect(getGrade(50)).toBe('C');
		expect(getGrade(57)).toBe('C');
	});

	it('returns D for score 30-43', () => {
		expect(getGrade(30)).toBe('D');
		expect(getGrade(36)).toBe('D');
		expect(getGrade(43)).toBe('D');
	});

	it('returns F for score < 30', () => {
		expect(getGrade(0)).toBe('F');
		expect(getGrade(15)).toBe('F');
		expect(getGrade(29)).toBe('F');
	});

	it('covers boundary values correctly', () => {
		expect(getGrade(84.9)).toBe('A');
		expect(getGrade(71.9)).toBe('B');
		expect(getGrade(57.9)).toBe('C');
		expect(getGrade(43.9)).toBe('D');
		expect(getGrade(29.9)).toBe('F');
	});
});

describe('getGradeInfo', () => {
	it('returns correct label and color for S', () => {
		const info = getGradeInfo(90);
		expect(info.grade).toBe('S');
		expect(info.label).toBe('ELITE');
		expect(info.color).toBe('#eab308');
	});

	it('returns correct label and color for A', () => {
		const info = getGradeInfo(75);
		expect(info.grade).toBe('A');
		expect(info.label).toBe('EXCELLENT');
		expect(info.color).toBe('#22d3ee');
	});

	it('returns correct label and color for B', () => {
		const info = getGradeInfo(62);
		expect(info.grade).toBe('B');
		expect(info.label).toBe('GOOD');
		expect(info.color).toBe('#10b981');
	});

	it('returns correct label and color for C', () => {
		const info = getGradeInfo(50);
		expect(info.grade).toBe('C');
		expect(info.label).toBe('AVERAGE');
		expect(info.color).toBe('#f97316');
	});

	it('returns correct label and color for D', () => {
		const info = getGradeInfo(35);
		expect(info.grade).toBe('D');
		expect(info.label).toBe('BELOW AVG');
		expect(info.color).toBe('#ef4444');
	});

	it('returns correct label and color for F', () => {
		const info = getGradeInfo(10);
		expect(info.grade).toBe('F');
		expect(info.label).toBe('POOR');
		expect(info.color).toBe('#ef4444');
	});

	it('returned object always has grade, label, and color fields', () => {
		for (const score of [0, 30, 44, 58, 72, 85, 100]) {
			const info = getGradeInfo(score);
			expect(info).toHaveProperty('grade');
			expect(info).toHaveProperty('label');
			expect(info).toHaveProperty('color');
		}
	});
});
