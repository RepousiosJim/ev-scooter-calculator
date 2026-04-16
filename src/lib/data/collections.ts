import type { ScooterConfig, PerformanceStats, PresetMetadata } from '$lib/types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScoreBreakdown, getGrade } from '$lib/utils/scoring';

/**
 * A curated collection of scooters targeting a specific commercial-intent query.
 * Each page prerenders a ranked list from the full preset catalog.
 */
export interface Collection {
	slug: string;
	h1: string;
	title: string;
	description: string;
	intro: string;
	keyword: string;
	limit: number;
	filter: (ctx: { config: ScooterConfig; stats: PerformanceStats; metadata: PresetMetadata }) => boolean;
	rank: (ctx: { config: ScooterConfig; stats: PerformanceStats; metadata: PresetMetadata; score: number }) => number;
	sortLabel: string;
}

export interface CollectionEntry {
	key: string;
	name: string;
	year: number;
	score: number;
	grade: string;
	speed: number;
	range: number;
	power: number;
	price?: number;
	weight?: number;
	sortValue: number;
}

export const collections: Collection[] = [
	{
		slug: 'best-budget-scooters',
		h1: 'Best Budget Electric Scooters',
		title: 'Best Budget Electric Scooters Under $800 (2026)',
		description:
			'Our ranked list of the best affordable electric scooters under $800, scored on real-world range, speed, and build quality. Updated for 2026.',
		keyword: 'budget electric scooter',
		intro:
			'Every scooter below comes in under $800 retail, scored across range, speed, power, and real-world efficiency using our physics-based calculator. They are ranked by overall performance grade so you see the best value-for-money first — not the cheapest.',
		limit: 12,
		filter: ({ metadata }) => metadata.manufacturer?.price != null && metadata.manufacturer.price <= 800,
		rank: ({ score }) => score,
		sortLabel: 'Overall score',
	},
	{
		slug: 'best-long-range-scooters',
		h1: 'Best Long-Range Electric Scooters',
		title: 'Best Long-Range Electric Scooters — 80+ km Range (2026)',
		description:
			'Top long-range electric scooters ranked by calculated real-world range. These are the picks for commutes over 40 km or riders who hate charging.',
		keyword: 'long range electric scooter',
		intro:
			'Long-range scooters combine high-capacity batteries with efficient drivetrains. Each entry below has a calculated range of 60 km or more under realistic conditions. The ranking reflects the real-world range our calculator produces — not the optimistic manufacturer spec.',
		limit: 12,
		filter: ({ stats }) => stats.totalRange >= 60,
		rank: ({ stats }) => stats.totalRange,
		sortLabel: 'Calculated range (km)',
	},
	{
		slug: 'fastest-electric-scooters',
		h1: 'Fastest Electric Scooters',
		title: 'Fastest Electric Scooters in 2026 — Ranked by Top Speed',
		description:
			'The fastest electric scooters we track, ranked by calculated top speed. See real performance numbers on high-voltage, dual-motor flagship models.',
		keyword: 'fastest electric scooter',
		intro:
			'Top-speed numbers on spec sheets rarely survive a real road. The ranking below reflects calculated top speed from our physics engine — factoring motor Kv, voltage, rider weight, and drag — rather than the manufacturer advertised cap. If outright speed is your priority, start here.',
		limit: 10,
		filter: ({ stats }) => stats.speed >= 60,
		rank: ({ stats }) => stats.speed,
		sortLabel: 'Calculated top speed (km/h)',
	},
	{
		slug: 'best-commuter-scooters',
		h1: 'Best Electric Scooters for Commuting',
		title: 'Best Electric Scooters for Commuting (2026)',
		description:
			'The best electric scooters for daily commuting — balanced on range (25–80 km), portability, and price. Physics-based rankings, no sponsored picks.',
		keyword: 'best commuter electric scooter',
		intro:
			'A great commuter scooter hits the sweet spot: enough range to cover a full day with reserve, light enough to carry up stairs, and priced where theft loss is survivable. We filtered the catalog to scooters with 25–80 km calculated range under $1,800 and ranked by overall score.',
		limit: 12,
		filter: ({ stats, metadata }) =>
			stats.totalRange >= 25 &&
			stats.totalRange <= 80 &&
			(metadata.manufacturer?.price == null || metadata.manufacturer.price <= 1800),
		rank: ({ score }) => score,
		sortLabel: 'Overall score',
	},
	{
		slug: 'best-hill-climbing-scooters',
		h1: 'Best Hill-Climbing Electric Scooters',
		title: 'Best Hill-Climbing Electric Scooters for Steep Routes',
		description:
			'Scooters that actually climb steep hills without bogging down. Ranked by calculated hill-climb speed on a 10% grade using our physics engine.',
		keyword: 'hill climbing electric scooter',
		intro:
			'Climbing ability is where budget scooters fall apart. The ranking below uses our calculated hill speed on a 10% grade — accounting for motor torque, continuous current limits, and voltage sag under load — to sort the catalog. If your commute has real hills, these are the picks.',
		limit: 10,
		filter: ({ stats }) => stats.hillSpeed >= 15,
		rank: ({ stats }) => stats.hillSpeed,
		sortLabel: 'Hill speed on 10% grade (km/h)',
	},
	{
		slug: 'best-performance-scooters',
		h1: 'Best High-Performance Electric Scooters',
		title: 'Best High-Performance Electric Scooters — Flagship Rankings',
		description:
			'The flagship electric scooter segment: dual-motor, 2000W+, high-voltage builds ranked by overall physics-based score. No filler.',
		keyword: 'high performance electric scooter',
		intro:
			'These are the top-tier scooters where price is no object: dual-motor, 2000W+ peak power, purpose-built for experienced riders who want the full envelope of speed, acceleration, and off-road capability. Ranked by overall performance grade.',
		limit: 10,
		filter: ({ stats }) => stats.totalWatts >= 2000,
		rank: ({ score }) => score,
		sortLabel: 'Overall score',
	},
	{
		slug: 'best-lightweight-scooters',
		h1: 'Best Lightweight Electric Scooters',
		title: 'Best Lightweight Electric Scooters Under 18 kg (2026)',
		description:
			'The lightest electric scooters worth riding, ranked by overall score. Perfect for apartment dwellers, multi-modal commuters, and transit riders.',
		keyword: 'lightweight electric scooter',
		intro:
			'A scooter you cannot carry is a scooter you stop using. Every entry below weighs under 18 kg — light enough to hoist up two flights of stairs or onto a subway car. Ranked by overall score so you get the best performing lightweight model first, not just the lightest.',
		limit: 10,
		filter: ({ config }) => (config.scooterWeight ?? 100) <= 18,
		rank: ({ score }) => score,
		sortLabel: 'Overall score',
	},
	{
		slug: 'best-dual-motor-scooters',
		h1: 'Best Dual-Motor Electric Scooters',
		title: 'Best Dual-Motor Electric Scooters — All-Wheel-Drive Rankings (2026)',
		description:
			'Dual-motor electric scooters ranked by combined power and calculated top speed. AWD traction, higher peak watts, and real acceleration.',
		keyword: 'dual motor electric scooter',
		intro:
			'Dual-motor scooters bring AWD traction, much higher peak power, and meaningful acceleration past 40 km/h. Every scooter below has two motors; the ranking combines top speed and peak power so the fastest, most capable AWD builds surface at the top.',
		limit: 12,
		filter: ({ config }) => config.motors >= 2,
		rank: ({ stats }) => stats.speed + stats.totalWatts / 200,
		sortLabel: 'Combined speed + power',
	},
];

export function getCollection(slug: string): Collection | undefined {
	return collections.find((c) => c.slug === slug);
}

/**
 * Build the ranked entry list for a collection.
 * Runs the full physics engine against every preset — called once per page at build time
 * (prerender), so the runtime cost is amortized to zero.
 */
export function buildCollectionEntries(collection: Collection): CollectionEntry[] {
	const entries: CollectionEntry[] = [];

	for (const key of Object.keys(presets)) {
		if (key === 'custom') continue;
		const metadata = presetMetadata[key];
		if (!metadata) continue;

		const config = presets[key];
		const stats = calculatePerformance(config, 'spec');
		const breakdown = computeScoreBreakdown(config, stats);
		const score = breakdown.total;

		if (!collection.filter({ config, stats, metadata })) continue;

		entries.push({
			key,
			name: metadata.name,
			year: metadata.year,
			score,
			grade: getGrade(score),
			speed: stats.speed,
			range: stats.totalRange,
			power: stats.totalWatts,
			price: metadata.manufacturer?.price,
			weight: config.scooterWeight,
			sortValue: collection.rank({ config, stats, metadata, score }),
		});
	}

	entries.sort((a, b) => b.sortValue - a.sortValue);
	return entries.slice(0, collection.limit);
}
