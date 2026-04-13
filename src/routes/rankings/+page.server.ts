import type { PageServerLoad } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';

/**
 * Resolves the ?q= search param to a scooter key so SSR can generate
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

	return { ogScooterKey };
};
