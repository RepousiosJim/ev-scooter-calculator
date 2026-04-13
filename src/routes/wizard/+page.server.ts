import type { PageServerLoad } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScore, getGrade, getGradeInfo } from '$lib/utils/scoring';

export const load: PageServerLoad = () => {
	const scooters = Object.entries(presets)
		.filter(([key]) => key !== 'custom' && presetMetadata[key])
		.map(([key, config]) => {
			const meta = presetMetadata[key];
			const stats = calculatePerformance(config, 'spec');
			const score = computeScore(config, stats);
			return {
				key,
				name: meta.name,
				year: meta.year,
				price: meta.manufacturer?.price,
				status: meta.status,
				config,
				stats,
				score,
				grade: getGrade(score),
				gradeInfo: getGradeInfo(score),
				weight: config.scooterWeight ?? 0,
			};
		})
		.filter((s) => s.status !== 'discontinued');

	return { scooters };
};
