import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScoreBreakdown } from '$lib/utils/scoring';

/**
 * Convert a preset key to a URL slug segment.
 * `wolf_king_gtr` → `wolf-king-gtr`
 */
export function keyToSlug(key: string): string {
	return key.replace(/_/g, '-');
}

/**
 * Convert a URL slug segment back to a preset key.
 * `wolf-king-gtr` → `wolf_king_gtr`
 */
export function slugToKey(slug: string): string {
	return slug.replace(/-/g, '_');
}

/**
 * Build a comparison URL slug from two preset keys (alphabetically ordered
 * so A-vs-B and B-vs-A canonicalize to the same URL).
 */
export function makeComparisonSlug(keyA: string, keyB: string): string {
	const [a, b] = [keyA, keyB].sort();
	return `${keyToSlug(a)}-vs-${keyToSlug(b)}`;
}

/**
 * Parse a comparison slug `a-vs-b` into two preset keys.
 * Returns null if the slug is malformed or keys are unknown.
 */
export function parseComparisonSlug(slug: string): { keyA: string; keyB: string } | null {
	const parts = slug.split('-vs-');
	if (parts.length !== 2) return null;
	const keyA = slugToKey(parts[0]);
	const keyB = slugToKey(parts[1]);
	if (!presets[keyA] || !presets[keyB] || keyA === keyB) return null;
	if (!presetMetadata[keyA] || !presetMetadata[keyB]) return null;
	return { keyA, keyB };
}

export interface ComparisonPair {
	slug: string;
	keyA: string;
	keyB: string;
	nameA: string;
	nameB: string;
}

/**
 * Generate a curated list of high-signal comparison pairs for SEO-driven
 * programmatic page generation. Strategy:
 *
 * 1. **Top-20 head-to-heads** — All pairs among the 20 highest-scoring scooters.
 *    These are the pages enthusiasts actually search for ("dualtron thunder vs kaabo wolf king").
 * 2. **Same-brand intra-lineup** — For each brand with ≥2 presets, compare flagships within the lineup.
 * 3. **Price-tier pairs** — Scooters within ±15% price of each other (value shoppers).
 *
 * Target output: 150–250 unique pairs. Deduped by canonical slug.
 */
export function getTopComparisonPairs(): ComparisonPair[] {
	const allKeys = Object.keys(presets).filter((k) => k !== 'custom' && presetMetadata[k]);

	const scored = allKeys
		.map((key) => {
			const config = presets[key];
			const stats = calculatePerformance(config, 'spec');
			const score = computeScoreBreakdown(config, stats).total;
			const meta = presetMetadata[key];
			return {
				key,
				name: meta.name,
				brand: meta.name.split(' ')[0],
				price: meta.manufacturer?.price,
				score,
			};
		})
		.sort((a, b) => b.score - a.score);

	const pairs = new Map<string, ComparisonPair>();

	const addPair = (keyA: string, keyB: string) => {
		if (keyA === keyB) return;
		const slug = makeComparisonSlug(keyA, keyB);
		if (pairs.has(slug)) return;
		pairs.set(slug, {
			slug,
			keyA,
			keyB,
			nameA: presetMetadata[keyA].name,
			nameB: presetMetadata[keyB].name,
		});
	};

	// 1. All pairs among the top 20
	const top20 = scored.slice(0, 20);
	for (let i = 0; i < top20.length; i++) {
		for (let j = i + 1; j < top20.length; j++) {
			addPair(top20[i].key, top20[j].key);
		}
	}

	// 2. Same-brand flagship pairs — for each brand, pair its top 3 models together
	const byBrand = new Map<string, typeof scored>();
	for (const s of scored) {
		const list = byBrand.get(s.brand) ?? [];
		list.push(s);
		byBrand.set(s.brand, list);
	}
	for (const [, brandScooters] of byBrand) {
		const top3 = brandScooters.slice(0, 3);
		for (let i = 0; i < top3.length; i++) {
			for (let j = i + 1; j < top3.length; j++) {
				addPair(top3[i].key, top3[j].key);
			}
		}
	}

	// 3. Price-tier pairs — for each scooter in top 50, pair with next 2 of similar price
	const top50 = scored.slice(0, 50).filter((s) => s.price != null);
	for (let i = 0; i < top50.length; i++) {
		const a = top50[i];
		const similar = top50
			.filter((b) => {
				if (b.key === a.key) return false;
				const priceDiff = Math.abs((b.price ?? 0) - (a.price ?? 0)) / (a.price ?? 1);
				return priceDiff <= 0.15;
			})
			.slice(0, 2);
		for (const b of similar) addPair(a.key, b.key);
	}

	return Array.from(pairs.values());
}
