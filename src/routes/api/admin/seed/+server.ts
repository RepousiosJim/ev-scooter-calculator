import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { getStore, addSource, addPriceObservation } from '$lib/server/verification/store';
import { seedData, getSeedDataKeys } from '$lib/server/verification/seed-data';
import {
	SPEC_FIELD_UNITS,
	type SpecField,
	type SourceEntry,
	type PriceObservation,
} from '$lib/server/verification/types';
import { randomBytes } from 'crypto';
import { logActivity } from '$lib/server/verification/activity-log';

/**
 * Seed the verification database with pre-verified cross-referenced spec data.
 * This populates all scooters with data from known reliable sources
 * so the admin doesn't have to manually enter everything.
 */
export const POST: RequestHandler = async ({ cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const store = await getStore();
	const keys = getSeedDataKeys();
	let totalSources = 0;
	let totalPrices = 0;

	for (const scooterKey of keys) {
		const data = seedData[scooterKey];
		if (!data) continue;

		// Add spec sources
		for (const [field, sources] of Object.entries(data.specs)) {
			for (const src of sources) {
				const sourceEntry: SourceEntry = {
					id: randomBytes(8).toString('hex'),
					type: src.type,
					name: src.source,
					url: src.url,
					value: src.value,
					unit: SPEC_FIELD_UNITS[field as SpecField] || '',
					fetchedAt: new Date().toISOString(),
					addedBy: 'manual',
					notes: 'Pre-seeded from curated database',
				};

				await addSource(store, scooterKey, field as SpecField, sourceEntry);
				totalSources++;
			}
		}

		// Add price observations
		for (const price of data.prices) {
			const obs: PriceObservation = {
				price: price.price,
				currency: 'USD',
				source: price.source,
				url: price.url,
				observedAt: new Date().toISOString(),
				inStock: true,
			};
			await addPriceObservation(store, scooterKey, obs);
			totalPrices++;
		}
	}

	await logActivity(
		'seed_completed',
		`Seeded ${keys.length} scooters with ${totalSources} sources and ${totalPrices} prices`,
		{
			scootersSeeded: keys.length,
			totalSources,
			totalPrices,
		}
	);

	return json({
		success: true,
		scootersSeeded: keys.length,
		totalSources,
		totalPrices,
		message: `Seeded ${keys.length} scooters with ${totalSources} source entries and ${totalPrices} price observations.`,
	});
};
