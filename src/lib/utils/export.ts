import type { ScooterConfig, PerformanceStats } from '$lib/types';

function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

interface ExportRow {
	name: string;
	[key: string]: string | number | undefined;
}

function triggerDownload(content: string, filename: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function exportJSON(data: ExportRow[], filename = 'ev-scooter-results.json') {
	triggerDownload(JSON.stringify(data, null, 2), filename, 'application/json');
}

export function exportCSV(data: ExportRow[], filename = 'ev-scooter-results.csv') {
	if (data.length === 0) return;
	const headers = Object.keys(data[0]);
	const rows = data.map((row) =>
		headers
			.map((h) => {
				const val = row[h];
				if (val === undefined || val === null) return '';
				const str = String(val);
				return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
			})
			.join(',')
	);
	triggerDownload([headers.join(','), ...rows].join('\n'), filename, 'text/csv');
}

export function buildCalculatorExport(name: string, config: ScooterConfig, stats: PerformanceStats): ExportRow {
	return {
		name,
		voltage: config.v,
		capacity_ah: config.ah,
		motors: config.motors,
		watts_per_motor: config.watts,
		controller_amps: config.controller,
		rider_weight_kg: config.weight,
		wheel_inches: config.wheel,
		slope_percent: config.slope,
		battery_soh: config.soh,
		range_km: round(stats.totalRange, 1),
		top_speed_kmh: round(stats.speed, 1),
		hill_speed_kmh: round(stats.hillSpeed, 1),
		total_watts: Math.round(stats.totalWatts),
		charge_time_h: round(stats.chargeTime, 1),
		cost_per_100km: round(stats.costPer100km, 2),
		accel_score: Math.round(stats.accelScore),
		c_rate: round(stats.cRate, 2),
		energy_wh: Math.round(stats.wh),
	};
}

export function buildRankingsExport(
	rankings: Array<{
		name: string;
		year: number;
		score: number;
		grade: string;
		price?: number;
		stats: PerformanceStats;
		config: ScooterConfig;
	}>
): ExportRow[] {
	return rankings.map((s) => ({
		name: s.name,
		year: s.year,
		score: round(s.score, 1),
		grade: s.grade,
		price: s.price,
		range_km: round(s.stats.totalRange, 1),
		top_speed_kmh: round(s.stats.speed, 1),
		power_w: Math.round(s.stats.totalWatts),
		energy_wh: Math.round(s.stats.wh),
		charge_time_h: round(s.stats.chargeTime, 1),
		accel_score: Math.round(s.stats.accelScore),
		c_rate: round(s.stats.cRate, 2),
	}));
}
