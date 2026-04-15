import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScore, getGradeInfo } from '$lib/utils/scoring';
import { detectBottlenecks } from '$lib/physics/bottlenecks';
import { generateRecommendations } from '$lib/physics/recommendations';
import { corsResponse, applyRateLimit, apiScoreBreakdown } from '$lib/server/api-helpers';
import type { ScooterConfig, PredictionMode } from '$lib/types';

export const OPTIONS: RequestHandler = async () => corsResponse();

interface ValidationError {
	field: string;
	message: string;
}

function validateConfig(body: Record<string, unknown>): ValidationError[] {
	const errors: ValidationError[] = [];

	// Required numeric fields with their validation rules
	const required: Array<{ field: string; min?: number; max?: number; label?: string; integer?: boolean }> = [
		{ field: 'v', min: 24, max: 96, label: 'voltage' },
		{ field: 'ah', min: 0.1, label: 'battery capacity (Ah)' },
		{ field: 'motors', min: 1, max: 4, label: 'motor count', integer: true },
		{ field: 'watts', min: 1, label: 'watts per motor' },
		{ field: 'style', min: 5, max: 100, label: 'energy consumption (Wh/km)' },
		{ field: 'weight', min: 30, max: 250, label: 'rider weight (kg)' },
		{ field: 'wheel', min: 5, max: 18, label: 'wheel size (inches)' },
		{ field: 'charger', min: 0.5, max: 30, label: 'charger amperage' },
		{ field: 'regen', min: 0, max: 1, label: 'regen efficiency' },
		{ field: 'cost', min: 0, label: 'electricity cost ($/kWh)' },
		{ field: 'slope', min: 0, max: 60, label: 'slope (%)' },
		{ field: 'ridePosition', min: 0.3, max: 1.0, label: 'ride position (drag)' },
		{ field: 'soh', min: 0.5, max: 1.0, label: 'state of health' },
		{ field: 'ambientTemp', min: -30, max: 60, label: 'ambient temperature (°C)' },
	];

	for (const rule of required) {
		const val = body[rule.field];
		if (val === undefined || val === null) {
			errors.push({ field: rule.field, message: `'${rule.field}' (${rule.label ?? rule.field}) is required` });
			continue;
		}
		const num = Number(val);
		if (isNaN(num)) {
			errors.push({ field: rule.field, message: `'${rule.field}' must be a number` });
			continue;
		}
		if (rule.integer && !Number.isInteger(num)) {
			errors.push({ field: rule.field, message: `'${rule.field}' must be an integer` });
		}
		if (rule.min !== undefined && num < rule.min) {
			errors.push({ field: rule.field, message: `'${rule.field}' must be >= ${rule.min}` });
		}
		if (rule.max !== undefined && num > rule.max) {
			errors.push({ field: rule.field, message: `'${rule.field}' must be <= ${rule.max}` });
		}
	}

	return errors;
}

function coerceConfig(body: Record<string, unknown>): ScooterConfig {
	const n = (field: string) => Number(body[field]);
	const opt = (field: string) => (body[field] !== undefined ? Number(body[field]) : undefined);

	return {
		v: n('v'),
		ah: n('ah'),
		motors: n('motors'),
		watts: n('watts'),
		style: n('style'),
		weight: n('weight'),
		wheel: n('wheel'),
		charger: n('charger'),
		regen: n('regen'),
		cost: n('cost'),
		slope: n('slope'),
		ridePosition: n('ridePosition'),
		soh: n('soh'),
		ambientTemp: n('ambientTemp'),
		// Optional fields
		motorKv: opt('motorKv'),
		scooterWeight: opt('scooterWeight'),
		drivetrainEfficiency: opt('drivetrainEfficiency') ?? 0.9,
		batterySagPercent: opt('batterySagPercent') ?? 0.08,
	};
}

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	const { headers, limited } = await applyRateLimit(getClientAddress(), false);
	if (limited) return limited;

	// Parse body
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body', status: 400 }, { status: 400, headers });
	}

	// Validate
	const errors = validateConfig(body);
	if (errors.length > 0) {
		return json({ error: 'Validation failed', status: 400, details: errors }, { status: 400, headers });
	}

	// Parse mode
	const modeParam = url.searchParams.get('mode');
	const mode: PredictionMode = modeParam === 'realworld' ? 'realworld' : 'spec';

	const config = coerceConfig(body);
	const stats = calculatePerformance(config, mode);
	const score = computeScore(config, stats);
	const gradeInfo = getGradeInfo(score);
	const scoreBreakdown = apiScoreBreakdown(config, stats);
	const bottlenecks = detectBottlenecks(stats, config);
	const recommendations = generateRecommendations(config, stats);

	// Strip internal fields from the echoed config
	const {
		controller: _controller,
		rpm: _rpm,
		dragCoefficient: _dc,
		frontalArea: _fa,
		rollingResistance: _rr,
		...publicConfig
	} = config as ScooterConfig & {
		controller?: number;
		rpm?: number;
		dragCoefficient?: number;
		frontalArea?: number;
		rollingResistance?: number;
	};

	return json(
		{
			data: {
				config: publicConfig,
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
					mode,
				},
				score,
				grade: gradeInfo.grade,
				gradeLabel: gradeInfo.label,
				scoreBreakdown,
				bottlenecks,
				recommendations,
			},
		},
		{ headers }
	);
};
