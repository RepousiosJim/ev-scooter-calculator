import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { detectBottlenecks } from '$lib/physics/bottlenecks';
import { generateRecommendations } from '$lib/physics/recommendations';
import { computeScoreBreakdown, getGrade, getGradeInfo } from '$lib/utils/scoring';
import { makeComparisonSlug } from '$lib/utils/comparison-pairs';
import type { ScooterConfig, PerformanceStats, Bottleneck, Recommendation, PresetMetadata } from '$lib/types';
import type { ScoreBreakdown, GradeInfo } from '$lib/utils/scoring';

export interface RelatedScooter {
	key: string;
	name: string;
	year: number;
	score: number;
	grade: string;
	compareSlug: string;
}

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
	relatedScooters: RelatedScooter[];
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

	// Compute related scooters: 2 same-brand + 3 closest-scoring cross-brand.
	// These power the "Compare with" internal-link block — critical for SEO crawl depth
	// and for funneling users from single-scooter pages into programmatic /compare routes.
	const brand = metadata.name.split(' ')[0];
	const allOthers = Object.keys(presets)
		.filter((k) => k !== 'custom' && k !== key && presetMetadata[k])
		.map((k) => {
			const otherConfig = presets[k];
			const otherStats = calculatePerformance(otherConfig, 'spec');
			const otherScore = computeScoreBreakdown(otherConfig, otherStats).total;
			const otherMeta = presetMetadata[k];
			return {
				key: k,
				name: otherMeta.name,
				year: otherMeta.year,
				score: otherScore,
				grade: getGrade(otherScore),
				brand: otherMeta.name.split(' ')[0],
			};
		});

	const sameBrand = allOthers
		.filter((s) => s.brand === brand)
		.sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))
		.slice(0, 2);

	const crossBrand = allOthers
		.filter((s) => s.brand !== brand && !sameBrand.some((sb) => sb.key === s.key))
		.sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))
		.slice(0, 3);

	const relatedScooters: RelatedScooter[] = [...sameBrand, ...crossBrand].map((s) => ({
		key: s.key,
		name: s.name,
		year: s.year,
		score: s.score,
		grade: s.grade,
		compareSlug: makeComparisonSlug(key, s.key),
	}));

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
		relatedScooters,
	} satisfies ScooterPageData;
};
