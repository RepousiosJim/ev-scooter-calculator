import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScore, getGrade } from '$lib/utils/scoring';
import { corsResponse, applyRateLimit } from '$lib/server/api-helpers';
import type { Grade } from '$lib/utils/scoring';

interface ScooterListEntry {
	key: string;
	name: string;
	year: number;
	price: number | null;
	status: string;
	score: number;
	grade: Grade;
	specs: {
		voltage: number;
		batteryAh: number;
		motorPower: number;
		motorCount: number;
	};
	performance: {
		range: number;
		topSpeed: number;
		power: number;
		accelScore: number;
	};
}

function buildScooterEntry(key: string): ScooterListEntry | null {
	const config = presets[key];
	const meta = presetMetadata[key];
	if (!config || !meta) return null;

	const stats = calculatePerformance(config, 'spec');
	const score = computeScore(config, stats);
	const grade = getGrade(score);

	return {
		key,
		name: meta.name,
		year: meta.year,
		price: meta.manufacturer.price ?? null,
		status: meta.status ?? 'unverified',
		score,
		grade,
		specs: {
			voltage: config.v,
			batteryAh: config.ah,
			motorPower: config.watts,
			motorCount: config.motors,
		},
		performance: {
			range: Math.round(stats.totalRange * 10) / 10,
			topSpeed: Math.round(stats.speed * 10) / 10,
			power: Math.round(stats.totalWatts),
			accelScore: Math.round(stats.accelScore),
		},
	};
}

// Precompute all entries once at module load (server restart picks up changes).
let _cached: ScooterListEntry[] | null = null;
function getAllEntries(): ScooterListEntry[] {
	if (_cached) return _cached;
	_cached = Object.keys(presets)
		.filter((k) => k !== 'custom' && presetMetadata[k])
		.reduce<ScooterListEntry[]>((acc, key) => {
			const entry = buildScooterEntry(key);
			if (entry) acc.push(entry);
			return acc;
		}, []);
	return _cached;
}

export const OPTIONS: RequestHandler = async () => corsResponse();

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const { headers, limited } = await applyRateLimit(getClientAddress());
	if (limited) return limited;

	let entries = getAllEntries();

	const statusFilter = url.searchParams.get('status');
	if (statusFilter) {
		entries = entries.filter((e) => e.status === statusFilter);
	}

	const sortParam = url.searchParams.get('sort');
	if (sortParam) {
		const desc = sortParam.startsWith('-');
		const field = desc ? sortParam.slice(1) : sortParam;
		const direction = desc ? -1 : 1;

		const getValue = (e: ScooterListEntry): number => {
			switch (field) {
				case 'score':
					return e.score;
				case 'price':
					return e.price ?? 0;
				case 'range':
					return e.performance.range;
				case 'speed':
					return e.performance.topSpeed;
				case 'power':
					return e.performance.power;
				case 'year':
					return e.year;
				default:
					return 0;
			}
		};

		entries = [...entries].sort((a, b) => direction * (getValue(a) - getValue(b)));
	}

	const ALLOWED_FIELDS = new Set(['key', 'name', 'year', 'price', 'status', 'score', 'grade', 'specs', 'performance']);

	const fieldsParam = url.searchParams.get('fields');
	let data: unknown[] = entries;
	if (fieldsParam) {
		const requestedFields = new Set(
			fieldsParam
				.split(',')
				.map((f) => f.trim())
				.filter((f) => ALLOWED_FIELDS.has(f))
		);
		data = entries.map((entry) => {
			const filtered: Record<string, unknown> = {};
			for (const f of requestedFields) {
				filtered[f] = (entry as unknown as Record<string, unknown>)[f];
			}
			// Always include key for identification
			filtered.key = entry.key;
			return filtered;
		});
	}

	return json(
		{
			data,
			meta: {
				total: data.length,
				apiVersion: '1.0',
			},
		},
		{ headers }
	);
};
