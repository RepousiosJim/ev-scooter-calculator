/**
 * Pre-verified spec data from multiple cross-referenced sources.
 * This serves as a curated baseline so the admin doesn't start from zero.
 * Sources: manufacturer spec sheets, Electric Scooter Guide, retailer listings.
 *
 * Each entry includes the source name so it's traceable.
 */

import type { SpecField } from './types';

interface SeedSpec {
	value: number;
	source: string;
	url?: string;
	type: 'manufacturer' | 'retailer' | 'review';
}

export interface SeedScooterData {
	specs: Partial<Record<SpecField, SeedSpec[]>>;
	prices: { price: number; source: string; url?: string }[];
}

export const seedData: Record<string, SeedScooterData> = {
	// --- 2024/2025 FLAGSHIP ---
	emove_roadster: {
		specs: {
			topSpeed: [
				{ value: 112, source: 'Voro Motors Spec Sheet', type: 'manufacturer' },
				{ value: 110, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 110, source: 'Voro Motors Spec Sheet', type: 'manufacturer' },
				{ value: 96, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 3360, source: 'Voro Motors Spec Sheet', type: 'manufacturer' },
				{ value: 3360, source: 'Electric Scooter Guide', type: 'review' },
			],
			voltage: [
				{ value: 84, source: 'Voro Motors Spec Sheet', type: 'manufacturer' },
			],
			motorWatts: [
				{ value: 6000, source: 'Voro Motors (2x3000W)', type: 'manufacturer' },
			],
			weight: [
				{ value: 65, source: 'Voro Motors Spec Sheet', type: 'manufacturer' },
			],
			wheelSize: [
				{ value: 11, source: 'Voro Motors Spec Sheet', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 5995, source: 'Voro Motors' },
		],
	},

	inmotion_rs: {
		specs: {
			topSpeed: [
				{ value: 110, source: 'InMotion Official', type: 'manufacturer' },
				{ value: 108, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 120, source: 'InMotion Official', type: 'manufacturer' },
				{ value: 85, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 2880, source: 'InMotion Official', type: 'manufacturer' },
				{ value: 2880, source: 'FluidFreeRide', type: 'retailer' },
			],
			voltage: [
				{ value: 72, source: 'InMotion Official', type: 'manufacturer' },
			],
			motorWatts: [
				{ value: 4000, source: 'InMotion (2x2000W)', type: 'manufacturer' },
			],
			weight: [
				{ value: 58, source: 'InMotion Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 3999, source: 'InMotion Official' },
			{ price: 3799, source: 'FluidFreeRide' },
		],
	},

	wolf_king_gtr: {
		specs: {
			topSpeed: [
				{ value: 105, source: 'Kaabo Official', type: 'manufacturer' },
				{ value: 101, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 140, source: 'Kaabo Official', type: 'manufacturer' },
				{ value: 80, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 2520, source: 'Kaabo Official', type: 'manufacturer' },
				{ value: 2520, source: 'Voro Motors', type: 'retailer' },
			],
			weight: [
				{ value: 63, source: 'Kaabo Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 3995, source: 'Kaabo USA' },
			{ price: 3795, source: 'Voro Motors' },
		],
	},

	teverun_fighter_supreme: {
		specs: {
			topSpeed: [
				{ value: 110, source: 'Teverun Official', type: 'manufacturer' },
			],
			range: [
				{ value: 120, source: 'Teverun Official', type: 'manufacturer' },
			],
			batteryWh: [
				{ value: 4320, source: 'Teverun Official', type: 'manufacturer' },
			],
			weight: [
				{ value: 45, source: 'Teverun Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 4299, source: 'MiniMotors USA' },
		],
	},

	nami_klima: {
		specs: {
			topSpeed: [
				{ value: 67, source: 'NAMI Official', type: 'manufacturer' },
				{ value: 65, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 80, source: 'NAMI Official', type: 'manufacturer' },
				{ value: 64, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 1500, source: 'NAMI Official', type: 'manufacturer' },
				{ value: 1500, source: 'FluidFreeRide', type: 'retailer' },
			],
			weight: [
				{ value: 36, source: 'NAMI Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 2199, source: 'NAMI Official' },
			{ price: 2199, source: 'FluidFreeRide' },
		],
	},

	apollo_city_2024_pro: {
		specs: {
			topSpeed: [
				{ value: 51, source: 'Apollo Scooters', type: 'manufacturer' },
				{ value: 50, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 69, source: 'Apollo Scooters', type: 'manufacturer' },
				{ value: 55, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 960, source: 'Apollo Scooters', type: 'manufacturer' },
			],
			weight: [
				{ value: 30, source: 'Apollo Scooters', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1699, source: 'Apollo Scooters' },
		],
	},

	apollo_go: {
		specs: {
			topSpeed: [
				{ value: 45, source: 'Apollo Scooters', type: 'manufacturer' },
			],
			range: [
				{ value: 48, source: 'Apollo Scooters', type: 'manufacturer' },
			],
			batteryWh: [
				{ value: 540, source: 'Apollo Scooters', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1199, source: 'Apollo Scooters' },
		],
	},

	niu_kqi_air: {
		specs: {
			topSpeed: [
				{ value: 32, source: 'NIU Official', type: 'manufacturer' },
			],
			range: [
				{ value: 50, source: 'NIU Official', type: 'manufacturer' },
				{ value: 40, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 451, source: 'NIU Official', type: 'manufacturer' },
			],
			weight: [
				{ value: 12, source: 'NIU Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1049, source: 'NIU Official' },
			{ price: 899, source: 'Amazon' },
		],
	},

	// --- 2023 MODELS ---
	nami_burn_e_2_max: {
		specs: {
			topSpeed: [
				{ value: 96, source: 'NAMI Official', type: 'manufacturer' },
				{ value: 93, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 140, source: 'NAMI Official', type: 'manufacturer' },
				{ value: 90, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 2304, source: 'NAMI Official', type: 'manufacturer' },
				{ value: 2304, source: 'FluidFreeRide', type: 'retailer' },
				{ value: 2304, source: 'Voro Motors', type: 'retailer' },
			],
			weight: [
				{ value: 47, source: 'NAMI Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 3499, source: 'NAMI Official' },
			{ price: 3299, source: 'FluidFreeRide' },
			{ price: 3399, source: 'Voro Motors' },
		],
	},

	segway_gt2: {
		specs: {
			topSpeed: [
				{ value: 70, source: 'Segway Store', type: 'manufacturer' },
				{ value: 68, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 90, source: 'Segway Store', type: 'manufacturer' },
				{ value: 56, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 1512, source: 'Segway Store', type: 'manufacturer' },
			],
			weight: [
				{ value: 52, source: 'Segway Store', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 3999, source: 'Segway Store' },
			{ price: 2999, source: 'Amazon' },
		],
	},

	segway_gt1: {
		specs: {
			topSpeed: [
				{ value: 60, source: 'Segway Store', type: 'manufacturer' },
			],
			range: [
				{ value: 70, source: 'Segway Store', type: 'manufacturer' },
			],
			batteryWh: [
				{ value: 1008, source: 'Segway Store', type: 'manufacturer' },
			],
			weight: [
				{ value: 48, source: 'Segway Store', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1999, source: 'Segway Store' },
		],
	},

	kaabo_mantis_king_gt: {
		specs: {
			topSpeed: [
				{ value: 70, source: 'Kaabo Official', type: 'manufacturer' },
				{ value: 67, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 80, source: 'Kaabo Official', type: 'manufacturer' },
				{ value: 60, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 1440, source: 'Kaabo Official', type: 'manufacturer' },
				{ value: 1440, source: 'Voro Motors', type: 'retailer' },
			],
			weight: [
				{ value: 34, source: 'Kaabo Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 2195, source: 'Kaabo USA' },
			{ price: 2099, source: 'Voro Motors' },
		],
	},

	segway_max_g2: {
		specs: {
			topSpeed: [
				{ value: 35, source: 'Segway Store', type: 'manufacturer' },
				{ value: 33, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 70, source: 'Segway Store', type: 'manufacturer' },
				{ value: 50, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 551, source: 'Segway Store', type: 'manufacturer' },
			],
			weight: [
				{ value: 24.3, source: 'Segway Store', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 899, source: 'Segway Store' },
			{ price: 749, source: 'Amazon' },
		],
	},

	niu_kqi3_max: {
		specs: {
			topSpeed: [
				{ value: 38, source: 'NIU Official', type: 'manufacturer' },
			],
			range: [
				{ value: 65, source: 'NIU Official', type: 'manufacturer' },
				{ value: 48, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 608, source: 'NIU Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 899, source: 'NIU Official' },
			{ price: 699, source: 'Amazon' },
		],
	},

	gotrax_g4: {
		specs: {
			topSpeed: [
				{ value: 32, source: 'Gotrax Official', type: 'manufacturer' },
			],
			range: [
				{ value: 40, source: 'Gotrax Official', type: 'manufacturer' },
				{ value: 30, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 374, source: 'Gotrax Official', type: 'manufacturer' },
			],
			weight: [
				{ value: 16.3, source: 'Gotrax Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 499, source: 'Gotrax Official' },
			{ price: 399, source: 'Amazon' },
		],
	},

	emove_cruiser_s: {
		specs: {
			topSpeed: [
				{ value: 53, source: 'Voro Motors', type: 'manufacturer' },
			],
			range: [
				{ value: 100, source: 'Voro Motors', type: 'manufacturer' },
				{ value: 72, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 1560, source: 'Voro Motors', type: 'manufacturer' },
			],
			weight: [
				{ value: 23, source: 'Voro Motors', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1399, source: 'Voro Motors' },
		],
	},

	// --- 2022 & CLASSICS ---
	vsett_10_plus: {
		specs: {
			topSpeed: [
				{ value: 80, source: 'VSETT Official', type: 'manufacturer' },
				{ value: 76, source: 'Electric Scooter Guide', type: 'review' },
			],
			range: [
				{ value: 100, source: 'VSETT Official', type: 'manufacturer' },
				{ value: 65, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 1536, source: 'VSETT Official', type: 'manufacturer' },
				{ value: 1536, source: 'RevRides', type: 'retailer' },
			],
			weight: [
				{ value: 36, source: 'VSETT Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1799, source: 'VSETT Official' },
			{ price: 1699, source: 'RevRides' },
		],
	},

	vsett_9_plus: {
		specs: {
			topSpeed: [
				{ value: 53, source: 'VSETT Official', type: 'manufacturer' },
			],
			range: [
				{ value: 70, source: 'VSETT Official', type: 'manufacturer' },
			],
			batteryWh: [
				{ value: 921, source: 'VSETT Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 1290, source: 'VSETT Official' },
		],
	},

	hiboy_s2_pro: {
		specs: {
			topSpeed: [
				{ value: 30, source: 'Hiboy Official', type: 'manufacturer' },
			],
			range: [
				{ value: 40, source: 'Hiboy Official', type: 'manufacturer' },
				{ value: 28, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 417, source: 'Hiboy Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 399, source: 'Hiboy Official' },
			{ price: 359, source: 'Amazon' },
		],
	},

	dualtron_thunder_3: {
		specs: {
			topSpeed: [
				{ value: 100, source: 'MiniMotors USA', type: 'retailer' },
			],
			range: [
				{ value: 125, source: 'MiniMotors USA', type: 'retailer' },
			],
			batteryWh: [
				{ value: 2880, source: 'MiniMotors USA', type: 'retailer' },
				{ value: 2880, source: 'Voro Motors', type: 'retailer' },
			],
			weight: [
				{ value: 47, source: 'MiniMotors USA', type: 'retailer' },
			],
		},
		prices: [
			{ price: 4499, source: 'MiniMotors USA' },
			{ price: 4299, source: 'Voro Motors' },
		],
	},

	m365_pro_2: {
		specs: {
			topSpeed: [
				{ value: 25, source: 'Xiaomi Official', type: 'manufacturer' },
			],
			range: [
				{ value: 45, source: 'Xiaomi Official', type: 'manufacturer' },
				{ value: 33, source: 'Electric Scooter Guide (tested)', type: 'review' },
			],
			batteryWh: [
				{ value: 460, source: 'Xiaomi Official', type: 'manufacturer' },
			],
			weight: [
				{ value: 14.2, source: 'Xiaomi Official', type: 'manufacturer' },
			],
		},
		prices: [
			{ price: 500, source: 'Xiaomi Store' },
			{ price: 449, source: 'Amazon' },
		],
	},
};

/** Get the list of scooter keys that have seed data */
export function getSeedDataKeys(): string[] {
	return Object.keys(seedData);
}
