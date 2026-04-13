import type { ScooterConfig, PerformanceStats } from '$lib/types';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type GradeInfo = { grade: Grade; label: string; color: string };

export interface ScoreBreakdown {
	total: number;
	accel: number; // max 30
	range: number; // max 25
	speed: number; // max 20
	efficiency: number; // max 15
	strainPenalty: number;
	weightPenalty: number;
}

export function computeScoreBreakdown(config: ScooterConfig, stats: PerformanceStats): ScoreBreakdown {
	const accel = Math.sqrt(stats.accelScore / 100) * 30;
	const range = Math.sqrt(Math.min(stats.totalRange, 200) / 200) * 25;
	const speed = Math.sqrt(Math.min(stats.speed, 120) / 120) * 20;
	const efficiency = Math.max(0, (35 - config.style) / 35) * 15;
	const strainPenalty = Math.max(0, (stats.cRate - 1.5) * 8);
	const weightPenalty = Math.max(0, ((config.scooterWeight ?? 30) - 25) / 100) * 5;

	const raw = accel + range + speed + efficiency - strainPenalty - weightPenalty;
	const total = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

	return {
		total,
		accel: Math.round(accel * 10) / 10,
		range: Math.round(range * 10) / 10,
		speed: Math.round(speed * 10) / 10,
		efficiency: Math.round(efficiency * 10) / 10,
		strainPenalty: Math.round(strainPenalty * 10) / 10,
		weightPenalty: Math.round(weightPenalty * 10) / 10,
	};
}

export function computeScore(config: ScooterConfig, stats: PerformanceStats): number {
	return computeScoreBreakdown(config, stats).total;
}

export function getGrade(score: number): Grade {
	if (score >= 85) return 'S';
	if (score >= 72) return 'A';
	if (score >= 58) return 'B';
	if (score >= 44) return 'C';
	if (score >= 30) return 'D';
	return 'F';
}

export function getGradeInfo(score: number): GradeInfo {
	const grade = getGrade(score);
	const map: Record<Grade, { label: string; color: string }> = {
		S: { label: 'ELITE', color: '#eab308' }, // yellow/gold
		A: { label: 'EXCELLENT', color: '#22d3ee' }, // cyan
		B: { label: 'GOOD', color: '#10b981' }, // green
		C: { label: 'AVERAGE', color: '#f97316' }, // orange
		D: { label: 'BELOW AVG', color: '#ef4444' }, // red
		F: { label: 'POOR', color: '#ef4444' }, // red
	};
	return { grade, ...map[grade] };
}
