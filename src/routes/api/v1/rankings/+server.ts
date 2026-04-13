import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScore, getGrade } from '$lib/utils/scoring';
import { corsResponse, applyRateLimit } from '$lib/server/api-helpers';

// Price bucket thresholds for category classification
const CATEGORY_RANGES: Record<string, [number, number]> = {
	budget: [0, 800],
	commuter: [800, 2000],
	performance: [2000, 4000],
	premium: [4000, Infinity],
};

interface RankingEntry {
	rank: number;
	key: string;
	name: string;
	year: number;
	price: number | null;
	status: string;
	score: number;
	grade: string;
	category: string;
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
	value: number; // score / (price / 1000), 0 if no price
}

function classifyCategory(price: number | null): string {
	if (price === null) return 'unknown';
	for (const [cat, [min, max]] of Object.entries(CATEGORY_RANGES)) {
		if (price >= min && price < max) return cat;
	}
	return 'premium';
}

// Module-level cache
let _rankingEntries: Omit<RankingEntry, 'rank'>[] | null = null;

function buildRankingEntries(): Omit<RankingEntry, 'rank'>[] {
	if (_rankingEntries) return _rankingEntries;

	_rankingEntries = Object.keys(presets)
		.filter((k) => k !== 'custom' && presetMetadata[k])
		.map((key) => {
			const config = presets[key];
			const meta = presetMetadata[key];

			const stats = calculatePerformance(config, 'spec');
			const score = computeScore(config, stats);
			const grade = getGrade(score);
			const price = meta.manufacturer.price ?? null;
			const value = price && price > 0 ? Math.round((score / (price / 1000)) * 10) / 10 : 0;

			return {
				key,
				name: meta.name,
				year: meta.year,
				price,
				status: meta.status ?? 'unverified',
				score,
				grade,
				category: classifyCategory(price),
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
				value,
			};
		});

	return _rankingEntries;
}

const SORT_KEYS = new Set(['score', 'range', 'speed', 'price', 'value']);

export const OPTIONS: RequestHandler = async () => corsResponse();

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const { headers, limited } = await applyRateLimit(getClientAddress());
	if (limited) return limited;

	// Parse query params
	const sortParam = url.searchParams.get('sort') ?? 'score';
	const sortField = SORT_KEYS.has(sortParam) ? sortParam : 'score';

	const limitParam = parseInt(url.searchParams.get('limit') ?? '20', 10);
	const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100);

	const offsetParam = parseInt(url.searchParams.get('offset') ?? '0', 10);
	const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam);

	const categoryFilter = url.searchParams.get('category');

	let entries = buildRankingEntries();

	// Filter by category
	if (categoryFilter && Object.keys(CATEGORY_RANGES).includes(categoryFilter)) {
		entries = entries.filter((e) => e.category === categoryFilter);
	}

	// Sort (always descending — higher is better for all supported keys except price)
	const getValue = (e: Omit<RankingEntry, 'rank'>): number => {
		switch (sortField) {
			case 'range':
				return e.performance.range;
			case 'speed':
				return e.performance.topSpeed;
			case 'price':
				return e.price ?? 0;
			case 'value':
				return e.value;
			default:
				return e.score; // 'score'
		}
	};

	// For price, ascending makes more sense (cheapest first).
	// For all others, descending (best first).
	const sortedAll = [...entries].sort((a, b) => {
		const diff = getValue(b) - getValue(a);
		if (sortField === 'price') return getValue(a) - getValue(b); // cheapest first
		return diff;
	});

	// Assign global rank before slicing
	const ranked: RankingEntry[] = sortedAll.map((entry, idx) => ({
		rank: idx + 1,
		...entry,
	}));

	const page = ranked.slice(offset, offset + limit);
	const total = ranked.length;

	return json(
		{
			data: page,
			meta: {
				total,
				limit,
				offset,
				sort: sortField,
				category: categoryFilter ?? null,
				apiVersion: '1.0',
			},
		},
		{ headers: { ...headers, 'Cache-Control': 'public, max-age=1800, s-maxage=86400' } }
	);
};
