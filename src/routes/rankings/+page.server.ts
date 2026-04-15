import type { PageServerLoad } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics';
import { computeScoreBreakdown, getGrade } from '$lib/utils/scoring';

/**
 * Pre-computes rankings on the server during SSR so the client receives
 * a ready-to-render ranked array instead of doing 166 physics calculations
 * in a $derived on the main thread.
 *
 * Also resolves the ?q= search param to a scooter key so SSR can generate
 * a correct og:image URL for social previews.
 */
export const load: PageServerLoad = ({ url }) => {
	const q = url.searchParams.get('q')?.toLowerCase().trim() ?? '';

	let ogScooterKey: string | null = null;

	if (q) {
		// 1. Exact key match
		if (q in presets && q !== 'custom') {
			ogScooterKey = q;
		} else {
			// 2. Find the first preset whose display name contains the query string
			for (const [key, meta] of Object.entries(presetMetadata)) {
				if (key === 'custom') continue;
				const name = meta.name.toLowerCase();
				if (name.includes(q)) {
					ogScooterKey = key;
					break;
				}
			}

			// 3. Fallback: match on the preset key itself
			if (!ogScooterKey) {
				const matched = Object.keys(presets).find((k) => k !== 'custom' && k.toLowerCase().includes(q));
				if (matched) ogScooterKey = matched;
			}
		}
	}

	// Pre-compute rankings server-side (avoids 166 physics calls on the client)
	const ranked = Object.entries(presets)
		.filter(([key]) => key !== 'custom')
		.map(([key, config]) => {
			const stats = calculatePerformance(config, 'spec');
			const meta = presetMetadata[key];
			const breakdown = computeScoreBreakdown(config, stats);
			const price = meta?.manufacturer?.price;
			return {
				key,
				name: meta?.name ?? key,
				year: meta?.year ?? 0,
				config,
				stats,
				score: breakdown.total,
				grade: getGrade(breakdown.total),
				breakdown,
				price,
				batteryWh: meta?.manufacturer?.batteryWh,
				status: meta?.status,
				hasPriceHistory: !!(meta?.priceHistory && meta.priceHistory.length > 0),
				priceChange:
					meta?.priceHistory && meta.priceHistory.length >= 2
						? (((meta.manufacturer?.price ?? meta.priceHistory[meta.priceHistory.length - 1].price) -
								meta.priceHistory[0].price) /
								meta.priceHistory[0].price) *
							100
						: undefined,
				valueScore: price && price > 0 ? Math.round((breakdown.total / (price / 1000)) * 10) / 10 : undefined,
			};
		});
	ranked.sort((a, b) => b.score - a.score);

	return { ogScooterKey, ranked };
};
