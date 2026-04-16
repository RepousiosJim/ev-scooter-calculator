import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScoreBreakdown, getGrade, getGradeInfo } from '$lib/utils/scoring';
import { parseComparisonSlug, getTopComparisonPairs } from '$lib/utils/comparison-pairs';
import type { ScooterConfig, PerformanceStats, PresetMetadata } from '$lib/types';
import type { ScoreBreakdown, GradeInfo } from '$lib/utils/scoring';

interface ScooterSide {
	key: string;
	config: ScooterConfig;
	metadata: PresetMetadata;
	stats: PerformanceStats;
	breakdown: ScoreBreakdown;
	score: number;
	grade: string;
	gradeInfo: GradeInfo;
}

export interface CompareWinner {
	category: string;
	winner: 'A' | 'B' | 'tie';
	valueA: number;
	valueB: number;
	unit: string;
	higherIsBetter: boolean;
}

export interface ComparePageData {
	slug: string;
	a: ScooterSide;
	b: ScooterSide;
	winners: CompareWinner[];
	overallWinner: 'A' | 'B' | 'tie';
}

// Prerender the top comparison pairs at build time for instant CDN delivery + SEO.
// SvelteKit handles the list via the entries() hook below.
export const prerender = true;

export const entries = () => getTopComparisonPairs().map((p) => ({ pair: p.slug }));

function buildSide(key: string): ScooterSide {
	const config = presets[key];
	const metadata = presetMetadata[key];
	const stats = calculatePerformance(config, 'spec');
	const breakdown = computeScoreBreakdown(config, stats);
	const score = breakdown.total;
	const grade = getGrade(score);
	const gradeInfo = getGradeInfo(score);
	return { key, config, metadata, stats, breakdown, score, grade, gradeInfo };
}

function decide(
	category: string,
	valueA: number,
	valueB: number,
	unit: string,
	higherIsBetter: boolean,
	tolerance = 0.02
): CompareWinner {
	const diff = Math.abs(valueA - valueB);
	const avg = (valueA + valueB) / 2 || 1;
	let winner: 'A' | 'B' | 'tie' = 'tie';
	if (diff / avg > tolerance) {
		if (higherIsBetter) winner = valueA > valueB ? 'A' : 'B';
		else winner = valueA < valueB ? 'A' : 'B';
	}
	return { category, winner, valueA, valueB, unit, higherIsBetter };
}

export const load: PageServerLoad = ({ params }) => {
	const parsed = parseComparisonSlug(params.pair);
	if (!parsed) {
		error(404, { message: 'Comparison not found' });
	}

	const a = buildSide(parsed.keyA);
	const b = buildSide(parsed.keyB);

	const winners: CompareWinner[] = [
		decide('Overall Score', a.score, b.score, '/100', true),
		decide('Top Speed', a.stats.speed, b.stats.speed, 'km/h', true),
		decide('Range', a.stats.totalRange, b.stats.totalRange, 'km', true),
		decide('Peak Power', a.stats.totalWatts, b.stats.totalWatts, 'W', true),
		decide('Hill Climb', a.stats.hillSpeed, b.stats.hillSpeed, 'km/h', true),
		decide('Acceleration', a.stats.accelScore, b.stats.accelScore, 'pts', true),
		decide('Battery', a.stats.wh, b.stats.wh, 'Wh', true),
	];

	if (a.metadata.manufacturer?.price && b.metadata.manufacturer?.price) {
		winners.push(decide('Price', a.metadata.manufacturer.price, b.metadata.manufacturer.price, 'USD', false));
	}

	const scoreA = winners.filter((w) => w.winner === 'A').length;
	const scoreB = winners.filter((w) => w.winner === 'B').length;
	const overallWinner: 'A' | 'B' | 'tie' = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie';

	return {
		slug: params.pair,
		a,
		b,
		winners,
		overallWinner,
	} satisfies ComparePageData;
};
