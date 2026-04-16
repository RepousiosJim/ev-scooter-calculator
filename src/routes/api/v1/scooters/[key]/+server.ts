import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScore, getGradeInfo } from '$lib/utils/scoring';
import { detectBottlenecks } from '$lib/physics/bottlenecks';
import { generateRecommendations } from '$lib/physics/recommendations';
import { corsResponse, applyRateLimit, apiScoreBreakdown } from '$lib/server/api-helpers';

export const OPTIONS: RequestHandler = async () => corsResponse();

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	const { headers, limited } = await applyRateLimit(getClientAddress());
	if (limited) return limited;

	const key = params.key;

	if (key === 'custom' || !presets[key] || !presetMetadata[key]) {
		return json({ error: `Scooter '${key}' not found`, status: 404 }, { status: 404, headers });
	}

	const config = presets[key];
	const meta = presetMetadata[key];

	const stats = calculatePerformance(config, 'spec');
	const specStats = stats;
	const realworldStats = calculatePerformance(config, 'realworld');
	const score = computeScore(config, stats);
	const gradeInfo = getGradeInfo(score);
	const scoreBreakdown = apiScoreBreakdown(config, stats);
	const bottlenecks = detectBottlenecks(stats, config);
	const recommendations = generateRecommendations(config, specStats, realworldStats);

	return json(
		{
			data: {
				key,
				name: meta.name,
				year: meta.year,
				price: meta.manufacturer.price ?? null,
				status: meta.status ?? 'unverified',
				score,
				grade: gradeInfo.grade,
				gradeLabel: gradeInfo.label,
				specs: {
					voltage: config.v,
					batteryAh: config.ah,
					motorPower: config.watts,
					motorCount: config.motors,
					wheelSize: config.wheel,
					riderWeight: config.weight,
				},
				performance: {
					range: Math.round(stats.totalRange * 10) / 10,
					topSpeed: Math.round(stats.speed * 10) / 10,
					hillSpeed: Math.round(stats.hillSpeed * 10) / 10,
					power: Math.round(stats.totalWatts),
					accelScore: Math.round(stats.accelScore),
					chargeTime: Math.round(stats.chargeTime * 100) / 100,
					costPer100km: Math.round(stats.costPer100km * 100) / 100,
					batteryWh: Math.round(stats.wh),
					cRate: Math.round(stats.cRate * 100) / 100,
				},
				scoreBreakdown,
				bottlenecks,
				recommendations,
			},
		},
		{ headers }
	);
};
