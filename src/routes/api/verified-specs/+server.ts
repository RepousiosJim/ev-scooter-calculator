import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/verification/store';

/** Public endpoint - no auth required. Returns verified specs for all scooters. */
export const GET: RequestHandler = async () => {
	const store = await getStore();
	const allData = await store.getAll();

	// Build a simplified response with only verified/high-confidence data
	const verifiedSpecs: Record<
		string,
		{
			overallConfidence: number;
			fields: Record<string, { value: number; confidence: number; status: string }>;
			latestPrice?: { price: number; source: string; observedAt: string };
		}
	> = {};

	for (const [key, verification] of Object.entries(allData)) {
		const fields: Record<string, { value: number; confidence: number; status: string }> = {};

		for (const [field, fieldData] of Object.entries(verification.fields)) {
			if (fieldData.sources.length > 0) {
				fields[field] = {
					value: fieldData.verifiedValue ?? fieldData.sources[0].value,
					confidence: fieldData.confidence,
					status: fieldData.status,
				};
			}
		}

		if (Object.keys(fields).length > 0 || verification.priceHistory.length > 0) {
			verifiedSpecs[key] = {
				overallConfidence: verification.overallConfidence,
				fields,
			};

			if (verification.priceHistory.length > 0) {
				const latest = verification.priceHistory[0];
				verifiedSpecs[key].latestPrice = {
					price: latest.price,
					source: latest.source,
					observedAt: latest.observedAt,
				};
			}
		}
	}

	return json(verifiedSpecs, {
		headers: {
			// Browser: 5 min | CDN: 10 min, then serve stale while revalidating in background (5 min window)
			'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=300',
		},
	});
};
