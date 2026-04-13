import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { detectBottlenecks } from '$lib/physics/bottlenecks';
import { generateRecommendations } from '$lib/physics/recommendations';
import { computeScoreBreakdown, getGrade, getGradeInfo } from '$lib/utils/scoring';
import type { ScooterConfig, PerformanceStats, Bottleneck, Recommendation, PresetMetadata } from '$lib/types';
import type { ScoreBreakdown, GradeInfo } from '$lib/utils/scoring';

export interface ScooterPageData {
	key: string;
	config: ScooterConfig;
	metadata: PresetMetadata;
	stats: PerformanceStats;
	breakdown: ScoreBreakdown;
	score: number;
	grade: string;
	gradeInfo: GradeInfo;
	bottlenecks: Bottleneck[];
	recommendations: Recommendation[];
}

export const load: PageServerLoad = ({ params }) => {
	const { key } = params;

	if (key === 'custom' || !presets[key] || !presetMetadata[key]) {
		error(404, { message: 'Scooter not found' });
	}

	const config = presets[key];
	const metadata = presetMetadata[key];
	const stats = calculatePerformance(config, 'spec');
	const breakdown = computeScoreBreakdown(config, stats);
	const score = breakdown.total;
	const grade = getGrade(score);
	const gradeInfo = getGradeInfo(score);
	const bottlenecks = detectBottlenecks(stats, config);
	const recommendations = generateRecommendations(config, stats);

	// Cache-Control is set by the parent +layout.server.ts

	return {
		key,
		config,
		metadata,
		stats,
		breakdown,
		score,
		grade,
		gradeInfo,
		bottlenecks,
		recommendations,
	} satisfies ScooterPageData;
};
