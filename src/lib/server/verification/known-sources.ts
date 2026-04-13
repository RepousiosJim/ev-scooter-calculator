/**
 * Known product page URLs for each scooter from manufacturers and major retailers.
 * These are used for automated spec verification - the system scrapes each URL
 * and extracts specs to cross-reference against stored values.
 *
 * Updated: 2026-04-11 — all URLs verified working (HTTP 200 + meaningful content).
 */

export interface KnownSource {
	name: string;
	type: 'manufacturer' | 'retailer' | 'review';
	url: string;
}

export const knownSources: Record<string, KnownSource[]> = {
	// --- 2024/2025 Models ---
	emove_roadster: [
		{ name: 'Voro Motors (Official)', type: 'manufacturer', url: 'https://www.voromotors.com/products/emove-roadster' },
	],
	inmotion_rs: [
		// FluidFreeRide and Voro both delisted — no verified working URL
	],
	wolf_king_gtr: [
		{ name: 'Voro Motors', type: 'retailer', url: 'https://www.voromotors.com/products/kaabo-wolf-king-gtr' },
	],
	teverun_fighter_supreme: [
		// Voro delisted, teverun.com blocks requests — no verified working URL
	],
	nami_klima: [{ name: 'FluidFreeRide', type: 'retailer', url: 'https://fluidfreeride.com/products/nami-klima' }],
	apollo_city_2024_pro: [
		{
			name: 'Electric Scooter Guide',
			type: 'review',
			url: 'https://electric-scooter.guide/reviews/apollo-city-pro-review/',
		},
	],
	apollo_go: [
		// ESG review removed, apolloscooters.com is JS-only — no verified working URL
	],
	niu_kqi_air: [{ name: 'NIU Official', type: 'manufacturer', url: 'https://global.niu.com/product/kqi-air' }],
	navee_gt3: [{ name: 'NAVEE Official', type: 'manufacturer', url: 'https://www.naveetech.com/gt3' }],
	segway_e2_pro: [
		// Removed from Segway store — no verified working URL
	],
	xiaomi_4_lite_2: [
		// Xiaomi site is JS-rendered — no static HTML specs
	],

	// --- 2023 Models ---
	nami_burn_e_2_max: [
		{ name: 'FluidFreeRide', type: 'retailer', url: 'https://fluidfreeride.com/products/nami-burn-e-2' },
		{
			name: 'Electric Scooter Guide',
			type: 'review',
			url: 'https://electric-scooter.guide/reviews/nami-burn-e-2-max-review/',
		},
	],
	segway_gt2: [{ name: 'Segway Store', type: 'manufacturer', url: 'https://store.segway.com/segway-superscooter-gt2' }],
	segway_gt1: [{ name: 'Segway Store', type: 'manufacturer', url: 'https://store.segway.com/segway-superscooter-gt1' }],
	kaabo_mantis_king_gt: [
		{ name: 'FluidFreeRide', type: 'retailer', url: 'https://fluidfreeride.com/products/kaabo-mantis-king-gt' },
	],
	mukuta_10_plus: [
		// Voro delisted, mukuta.com is JS-only — no verified working URL
	],
	roadrunner_rs5_plus: [
		// Domain roadrunnersscooters.com is dead — no verified working URL
	],
	segway_max_g2: [
		{ name: 'Segway Store', type: 'manufacturer', url: 'https://store.segway.com/ninebot-kickscooter-max-g2' },
		{
			name: 'Electric Scooter Guide',
			type: 'review',
			url: 'https://electric-scooter.guide/reviews/segway-max-g2-review/',
		},
	],
	niu_kqi3_max: [
		// NIU site restructured, product not found on new domain
	],
	gotrax_g4: [
		{
			name: 'Gotrax Official',
			type: 'manufacturer',
			url: 'https://gotrax.com/products/g4-electric-scooter-for-adults',
		},
		{ name: 'Electric Scooter Guide', type: 'review', url: 'https://electric-scooter.guide/reviews/gotrax-g4-review/' },
	],
	emove_cruiser_s: [
		{ name: 'Voro Motors (Official)', type: 'manufacturer', url: 'https://www.voromotors.com/products/emove-cruiser' },
		{
			name: 'Electric Scooter Guide',
			type: 'review',
			url: 'https://electric-scooter.guide/reviews/emove-cruiser-review/',
		},
	],
	xiaomi_4_ultra: [
		// Xiaomi site is JS-rendered — no static HTML specs
	],

	// --- 2022 & Classics ---
	vsett_10_plus: [
		{ name: 'RevRides', type: 'retailer', url: 'https://revrides.com/products/vsett-10' },
		{ name: 'Electric Scooter Guide', type: 'review', url: 'https://electric-scooter.guide/reviews/vsett-10-review/' },
	],
	vsett_9_plus: [{ name: 'RevRides', type: 'retailer', url: 'https://revrides.com/products/vsett-9-plus' }],
	vsett_8: [
		// Delisted from RevRides and FluidFreeRide — no verified working URL
	],
	turboant_x7_max: [
		// Domain iturboant.com is dead — no verified working URL
	],
	hiboy_s2_pro: [
		{
			name: 'Hiboy Official',
			type: 'manufacturer',
			url: 'https://www.hiboy.com/products/hiboy-s2-pro-electric-scooter',
		},
	],
	niu_kqi2_pro: [
		// NIU site restructured, product not found on new domain
	],
	unagi_voyager: [
		{
			name: 'Electric Scooter Guide',
			type: 'review',
			url: 'https://electric-scooter.guide/reviews/unagi-voyager-review/',
		},
	],
	uscooters_gt_sport: [
		// Product removed from uscooters.com — no verified working URL
	],
	inokim_light_2: [
		{
			name: 'Electric Scooter Guide',
			type: 'review',
			url: 'https://electric-scooter.guide/reviews/inokim-light-2-review/',
		},
	],
	dualtron_thunder_3: [
		// Delisted from Voro, no alternative found — no verified working URL
	],
	m365_pro_2: [
		// Xiaomi site is JS-rendered — no static HTML specs
	],
};

/** Get known sources for a scooter (static + dynamic), or empty array if none configured */
export async function getKnownSources(scooterKey: string): Promise<KnownSource[]> {
	const staticSources = knownSources[scooterKey] || [];

	// Merge with dynamic sources from the pipeline (lazy import to break circular dep)
	try {
		const { getDynamicSources } = await import('./pipeline-actions');
		const dynamicSources = getDynamicSources(scooterKey) as KnownSource[];
		if (dynamicSources.length > 0) {
			// Deduplicate by URL
			const staticUrls = new Set(staticSources.map((s) => s.url));
			const uniqueDynamic = dynamicSources.filter((s) => !staticUrls.has(s.url));
			return [...staticSources, ...uniqueDynamic];
		}
	} catch {
		// Pipeline module not available yet (circular import or startup)
	}

	return staticSources;
}

/** Get count of scooters with known sources */
export function getKnownSourceStats(): { total: number; withSources: number; totalUrls: number } {
	const keys = Object.keys(knownSources);
	return {
		total: keys.length,
		withSources: keys.filter((k) => knownSources[k].length > 0).length,
		totalUrls: keys.reduce((sum, k) => sum + knownSources[k].length, 0),
	};
}
