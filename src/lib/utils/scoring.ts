import type { ScooterConfig, PerformanceStats } from '$lib/types';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type GradeInfo = { grade: Grade; label: string; color: string };

export function computeScore(config: ScooterConfig, stats: PerformanceStats): number {
  // Weighted components with diminishing returns (sqrt scaling)
  const accelComponent = Math.sqrt(stats.accelScore / 100) * 30;       // max 30
  const rangeComponent = Math.sqrt(Math.min(stats.totalRange, 200) / 200) * 25;  // max 25
  const speedComponent = Math.sqrt(Math.min(stats.speed, 120) / 120) * 20;       // max 20
  const efficiencyComponent = Math.max(0, (35 - config.style) / 35) * 15;        // max 15

  // Penalties
  const strainPenalty = Math.max(0, (stats.cRate - 1.5) * 8);
  const weightPenalty = Math.max(0, ((config.scooterWeight ?? 30) - 25) / 100) * 5;

  const raw = accelComponent + rangeComponent + speedComponent + efficiencyComponent - strainPenalty - weightPenalty;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));  // one decimal place
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
    S: { label: 'ELITE', color: '#eab308' },      // yellow/gold
    A: { label: 'EXCELLENT', color: '#22d3ee' },   // cyan
    B: { label: 'GOOD', color: '#10b981' },        // green
    C: { label: 'AVERAGE', color: '#f97316' },     // orange
    D: { label: 'BELOW AVG', color: '#ef4444' },   // red
    F: { label: 'POOR', color: '#ef4444' },        // red
  };
  return { grade, ...map[grade] };
}
