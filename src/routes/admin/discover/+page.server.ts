import type { PageServerLoad } from './$types';
import { manufacturers, getScrapableManufacturers } from '$lib/server/verification/manufacturers';

export const load: PageServerLoad = async () => {
	const scrapable = getScrapableManufacturers();

	return {
		manufacturers: manufacturers.map((m) => ({
			id: m.id,
			name: m.name,
			website: m.website,
			scrapable: m.scrapable,
			knownScooterCount: m.knownScooterKeys.length,
			productListingUrls: m.productListingUrls,
			country: m.country,
			tier: m.tier,
		})),
		scrapableCount: scrapable.length,
		totalManufacturers: manufacturers.length,
	};
};
