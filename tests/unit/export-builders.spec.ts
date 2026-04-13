import { describe, it, expect } from 'vitest';
import { buildCalculatorExport, buildRankingsExport } from '$lib/utils/export';
import type { ScooterConfig, PerformanceStats } from '$lib/types';

const baseConfig: ScooterConfig = {
	v: 52,
	ah: 16,
	motors: 2,
	watts: 1600,
	style: 25,
	weight: 80,
	wheel: 10,
	charger: 3,
	regen: 0.05,
	cost: 0.2,
	slope: 5,
	ridePosition: 0.5,
	soh: 0.95,
	ambientTemp: 20,
	controller: 45,
};

const baseStats: PerformanceStats = {
	wh: 790.4,
	totalRange: 62.5,
	speed: 68.3,
	hillSpeed: 35.7,
	totalWatts: 3200,
	chargeTime: 5.33,
	costPer100km: 2.53,
	accelScore: 72,
	amps: 28.5,
	cRate: 1.78,
};

describe('buildCalculatorExport', () => {
	it('returns an object with all expected fields', () => {
		const row = buildCalculatorExport('Test Scooter', baseConfig, baseStats);

		expect(row).toHaveProperty('name');
		expect(row).toHaveProperty('voltage');
		expect(row).toHaveProperty('capacity_ah');
		expect(row).toHaveProperty('motors');
		expect(row).toHaveProperty('watts_per_motor');
		expect(row).toHaveProperty('controller_amps');
		expect(row).toHaveProperty('rider_weight_kg');
		expect(row).toHaveProperty('wheel_inches');
		expect(row).toHaveProperty('slope_percent');
		expect(row).toHaveProperty('battery_soh');
		expect(row).toHaveProperty('range_km');
		expect(row).toHaveProperty('top_speed_kmh');
		expect(row).toHaveProperty('hill_speed_kmh');
		expect(row).toHaveProperty('total_watts');
		expect(row).toHaveProperty('charge_time_h');
		expect(row).toHaveProperty('cost_per_100km');
		expect(row).toHaveProperty('accel_score');
		expect(row).toHaveProperty('c_rate');
		expect(row).toHaveProperty('energy_wh');
	});

	it('correctly maps config fields', () => {
		const row = buildCalculatorExport('My Scooter', baseConfig, baseStats);

		expect(row.name).toBe('My Scooter');
		expect(row.voltage).toBe(52);
		expect(row.capacity_ah).toBe(16);
		expect(row.motors).toBe(2);
		expect(row.watts_per_motor).toBe(1600);
		expect(row.controller_amps).toBe(45);
		expect(row.rider_weight_kg).toBe(80);
		expect(row.wheel_inches).toBe(10);
		expect(row.slope_percent).toBe(5);
		expect(row.battery_soh).toBe(0.95);
	});

	it('correctly maps and rounds stats fields', () => {
		const row = buildCalculatorExport('Test', baseConfig, baseStats);

		// range_km = round(62.5 * 10) / 10 = 62.5
		expect(row.range_km).toBe(62.5);
		// top_speed_kmh = round(68.3 * 10) / 10 = 68.3
		expect(row.top_speed_kmh).toBe(68.3);
		// hill_speed_kmh = round(35.7 * 10) / 10 = 35.7
		expect(row.hill_speed_kmh).toBe(35.7);
		// total_watts = round(3200) = 3200
		expect(row.total_watts).toBe(3200);
		// charge_time_h = round(5.33 * 10) / 10 = 5.3
		expect(row.charge_time_h).toBe(5.3);
		// cost_per_100km = round(2.53 * 100) / 100 = 2.53
		expect(row.cost_per_100km).toBe(2.53);
		// accel_score = round(72) = 72
		expect(row.accel_score).toBe(72);
		// c_rate = round(1.78 * 100) / 100 = 1.78
		expect(row.c_rate).toBe(1.78);
		// energy_wh = round(790.4) = 790
		expect(row.energy_wh).toBe(790);
	});

	it('passes through controller_amps as undefined when config has no controller', () => {
		const configNoController: ScooterConfig = { ...baseConfig, controller: undefined };
		const row = buildCalculatorExport('Test', configNoController, baseStats);
		expect(row.controller_amps).toBeUndefined();
	});

	it('handles a different scooter name', () => {
		const row = buildCalculatorExport('Apollo City Pro', baseConfig, baseStats);
		expect(row.name).toBe('Apollo City Pro');
	});

	it('correctly rounds stats with more decimal places', () => {
		const statsWithDecimals: PerformanceStats = {
			...baseStats,
			totalRange: 55.567,
			speed: 72.345,
			costPer100km: 1.999,
			cRate: 2.3456,
		};
		const row = buildCalculatorExport('Test', baseConfig, statsWithDecimals);

		expect(row.range_km).toBe(55.6); // round(55.567 * 10) / 10
		expect(row.top_speed_kmh).toBe(72.3); // round(72.345 * 10) / 10
		expect(row.cost_per_100km).toBe(2.0); // round(1.999 * 100) / 100 = 2
		expect(row.c_rate).toBe(2.35); // round(2.3456 * 100) / 100
	});
});

describe('buildRankingsExport', () => {
	const ranking1 = {
		name: 'Segway GT2',
		year: 2023,
		score: 82.456,
		grade: 'A',
		price: 3499,
		stats: {
			...baseStats,
			totalRange: 90.0,
			speed: 75.0,
			totalWatts: 6000,
			wh: 1500,
			chargeTime: 8.0,
			accelScore: 85,
			cRate: 2.5,
		},
		config: baseConfig,
	};

	const ranking2 = {
		name: 'Gotrax G4',
		year: 2022,
		score: 44.1,
		grade: 'C',
		price: undefined,
		stats: {
			...baseStats,
			totalRange: 25.0,
			speed: 30.0,
			totalWatts: 500,
			wh: 200,
			chargeTime: 4.0,
			accelScore: 40,
			cRate: 1.0,
		},
		config: { ...baseConfig, v: 36, watts: 500, motors: 1 },
	};

	it('returns an array of the same length as input', () => {
		const result = buildRankingsExport([ranking1, ranking2]);
		expect(result).toHaveLength(2);
	});

	it('returns empty array for empty input', () => {
		const result = buildRankingsExport([]);
		expect(result).toHaveLength(0);
	});

	it('each row has all required fields', () => {
		const result = buildRankingsExport([ranking1]);
		const row = result[0];

		expect(row).toHaveProperty('name');
		expect(row).toHaveProperty('year');
		expect(row).toHaveProperty('score');
		expect(row).toHaveProperty('grade');
		expect(row).toHaveProperty('price');
		expect(row).toHaveProperty('range_km');
		expect(row).toHaveProperty('top_speed_kmh');
		expect(row).toHaveProperty('power_w');
		expect(row).toHaveProperty('energy_wh');
		expect(row).toHaveProperty('charge_time_h');
		expect(row).toHaveProperty('accel_score');
		expect(row).toHaveProperty('c_rate');
	});

	it('correctly maps name, year, grade, price', () => {
		const result = buildRankingsExport([ranking1]);
		const row = result[0];

		expect(row.name).toBe('Segway GT2');
		expect(row.year).toBe(2023);
		expect(row.grade).toBe('A');
		expect(row.price).toBe(3499);
	});

	it('rounds score to 1 decimal place', () => {
		const result = buildRankingsExport([ranking1]);
		// round(82.456 * 10) / 10 = 82.5
		expect(result[0].score).toBe(82.5);
	});

	it('correctly rounds stats fields', () => {
		const result = buildRankingsExport([ranking1]);
		const row = result[0];

		expect(row.range_km).toBe(90.0);
		expect(row.top_speed_kmh).toBe(75.0);
		expect(row.power_w).toBe(6000);
		expect(row.energy_wh).toBe(1500);
		expect(row.charge_time_h).toBe(8.0);
		expect(row.accel_score).toBe(85);
		expect(row.c_rate).toBe(2.5);
	});

	it('handles undefined price', () => {
		const result = buildRankingsExport([ranking2]);
		expect(result[0].price).toBeUndefined();
	});

	it('maps multiple rankings in order', () => {
		const result = buildRankingsExport([ranking1, ranking2]);
		expect(result[0].name).toBe('Segway GT2');
		expect(result[1].name).toBe('Gotrax G4');
	});

	it('rounds decimal stats correctly across multiple entries', () => {
		const rankingWithDecimals = {
			...ranking1,
			score: 77.777,
			stats: {
				...ranking1.stats,
				totalRange: 88.88,
				speed: 66.66,
				cRate: 1.555,
			},
		};
		const result = buildRankingsExport([rankingWithDecimals]);
		const row = result[0];

		expect(row.score).toBe(77.8); // round(77.777 * 10) / 10
		expect(row.range_km).toBe(88.9); // round(88.88 * 10) / 10
		expect(row.top_speed_kmh).toBe(66.7); // round(66.66 * 10) / 10
		expect(row.c_rate).toBe(1.56); // round(1.555 * 100) / 100
	});
});
