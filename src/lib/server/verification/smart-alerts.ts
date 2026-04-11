/**
 * Smart Alerts Engine
 *
 * Analyzes all verification data and produces actionable alerts:
 * - Data conflicts (sources disagree)
 * - Stale/outdated data
 * - Missing critical specs
 * - Price anomalies (big price changes)
 * - Outlier values (unrealistic specs)
 * - Low confidence scooters needing attention
 */

import type {
	ScooterVerification,
	SpecField,
	FieldVerification,
} from './types';
import { presetMetadata } from '$lib/data/presets';
import { knownSources } from './known-sources';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertCategory =
	| 'conflict'
	| 'stale'
	| 'missing'
	| 'anomaly'
	| 'price_change'
	| 'low_confidence'
	| 'no_sources';

export interface SmartAlert {
	id: string;
	severity: AlertSeverity;
	category: AlertCategory;
	scooterKey: string;
	scooterName: string;
	title: string;
	description: string;
	field?: SpecField;
	actionLabel?: string;
	actionUrl?: string;
}

export interface AlertSummary {
	alerts: SmartAlert[];
	criticalCount: number;
	warningCount: number;
	infoCount: number;
	byCategory: Record<AlertCategory, number>;
	healthScore: number; // 0-100 overall system health
	topPriority: SmartAlert[];
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const STALE_DAYS = 30;
const CRITICAL_FIELDS: SpecField[] = ['topSpeed', 'range', 'batteryWh', 'price', 'motorWatts', 'weight'];
const CONFLICT_THRESHOLD_PERCENT = 15; // sources disagree by more than 15%

/** Sane ranges for spec fields — values outside these are anomalies */
const SPEC_RANGES: Partial<Record<SpecField, { min: number; max: number; unit: string }>> = {
	topSpeed: { min: 15, max: 160, unit: 'km/h' },
	range: { min: 10, max: 250, unit: 'km' },
	batteryWh: { min: 150, max: 10000, unit: 'Wh' },
	price: { min: 100, max: 15000, unit: 'USD' },
	voltage: { min: 24, max: 120, unit: 'V' },
	motorWatts: { min: 200, max: 20000, unit: 'W' },
	weight: { min: 5, max: 80, unit: 'kg' },
	wheelSize: { min: 5, max: 16, unit: 'in' },
};

// ---------------------------------------------------------------------------
// Alert generation
// ---------------------------------------------------------------------------

export function generateAlerts(
	allVerifications: Record<string, ScooterVerification>
): AlertSummary {
	const alerts: SmartAlert[] = [];
	let alertId = 0;

	const scooterKeys = Object.keys(presetMetadata).filter((k) => k !== 'custom');

	for (const key of scooterKeys) {
		const meta = presetMetadata[key];
		const verification = allVerifications[key];
		const name = meta?.name || key;

		// ---- No verification data at all ----
		if (!verification || Object.keys(verification.fields).length === 0) {
			const hasSources = key in knownSources;
			alerts.push({
				id: `alert-${alertId++}`,
				severity: hasSources ? 'warning' : 'info',
				category: 'no_sources',
				scooterKey: key,
				scooterName: name,
				title: 'No verification data',
				description: hasSources
					? `Has ${knownSources[key].length} source URL(s) but no scraped data yet. Run a scrape.`
					: 'No source URLs configured and no verification data.',
				actionLabel: 'View',
				actionUrl: `/admin/${key}`,
			});
			continue;
		}

		// ---- Check each field ----
		const staleFields: { field: SpecField; daysSince: number }[] = [];
		const missingFields: SpecField[] = [];
		for (const field of CRITICAL_FIELDS) {
			const fv = verification.fields[field];

			// Missing critical field — track for grouped alert
			if (!fv || fv.sources.length === 0) {
				missingFields.push(field);
				continue;
			}

			// Data conflict — sources disagree significantly
			if (fv.sources.length >= 2) {
				const values = fv.sources.map((s) => s.value);
				const min = Math.min(...values);
				const max = Math.max(...values);
				const avg = values.reduce((a, b) => a + b, 0) / values.length;

				if (avg > 0) {
					const spreadPercent = ((max - min) / avg) * 100;
					if (spreadPercent > CONFLICT_THRESHOLD_PERCENT) {
						alerts.push({
							id: `alert-${alertId++}`,
							severity: 'warning',
							category: 'conflict',
							scooterKey: key,
							scooterName: name,
							title: `${fieldLabel(field)} conflict`,
							description: `Sources disagree: ${min}–${max} ${fieldUnit(field)} (${Math.round(spreadPercent)}% spread across ${values.length} sources).`,
							field,
							actionLabel: 'Resolve',
							actionUrl: `/admin/${key}`,
						});
					}
				}
			}

			// Anomaly — value outside sane range (deduplicated: one alert per field)
			const range = SPEC_RANGES[field];
			if (range && fv.sources.length > 0) {
				const badSources = fv.sources.filter(
					(s) => s.value < range.min || s.value > range.max
				);
				if (badSources.length > 0) {
					const badValues = badSources.map((s) => `${s.value}`).join(', ');
					const badNames = badSources.map((s) => s.name).join(', ');
					alerts.push({
						id: `alert-${alertId++}`,
						severity: 'critical',
						category: 'anomaly',
						scooterKey: key,
						scooterName: name,
						title: `Suspicious ${fieldLabel(field)}`,
						description: `${badSources.length} source(s) report ${badValues} ${range.unit} — outside expected range (${range.min}–${range.max}). Sources: ${badNames}`,
						field,
						actionLabel: 'Review',
						actionUrl: `/admin/${key}`,
					});
				}
			}

			// Track stale fields (grouped per scooter below)
			if (fv.sources.length > 0) {
				const latestFetch = fv.sources.reduce((latest, s) => {
					const t = new Date(s.fetchedAt).getTime();
					return t > latest ? t : latest;
				}, 0);
				const daysSince = (Date.now() - latestFetch) / 86400000;
				if (daysSince > STALE_DAYS) {
					staleFields.push({ field, daysSince: Math.floor(daysSince) });
				}
			}
		}

		// ---- Grouped missing fields alert ----
		if (missingFields.length > 0 && missingFields.length < CRITICAL_FIELDS.length) {
			const fieldNames = missingFields.map(fieldLabel).join(', ');
			alerts.push({
				id: `alert-${alertId++}`,
				severity: missingFields.length >= 3 ? 'warning' : 'info',
				category: 'missing',
				scooterKey: key,
				scooterName: name,
				title: `${missingFields.length} spec(s) missing`,
				description: `Missing: ${fieldNames}`,
				actionLabel: 'Add data',
				actionUrl: `/admin/${key}`,
			});
		}

		// ---- Grouped stale data alert ----
		if (staleFields.length > 0) {
			const maxDays = Math.max(...staleFields.map((f) => f.daysSince));
			const fieldNames = staleFields.map((f) => fieldLabel(f.field)).join(', ');
			alerts.push({
				id: `alert-${alertId++}`,
				severity: 'info',
				category: 'stale',
				scooterKey: key,
				scooterName: name,
				title: `${staleFields.length} field(s) stale (${maxDays}+ days)`,
				description: `Stale fields: ${fieldNames}. Consider re-scraping.`,
				actionLabel: 'Re-scrape',
				actionUrl: `/admin/${key}`,
			});
		}

		// ---- Price change detection ----
		if (verification.priceHistory.length >= 2) {
			const sorted = [...verification.priceHistory].sort(
				(a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
			);
			const latest = sorted[0].price;
			const previous = sorted[1].price;
			if (previous > 0) {
				const changePercent = ((latest - previous) / previous) * 100;
				if (Math.abs(changePercent) >= 10) {
					alerts.push({
						id: `alert-${alertId++}`,
						severity: changePercent > 0 ? 'warning' : 'info',
						category: 'price_change',
						scooterKey: key,
						scooterName: name,
						title: `Price ${changePercent > 0 ? 'increased' : 'dropped'} ${Math.abs(Math.round(changePercent))}%`,
						description: `$${previous.toLocaleString()} → $${latest.toLocaleString()} (${changePercent > 0 ? '+' : ''}$${(latest - previous).toLocaleString()})`,
						field: 'price',
						actionLabel: 'View history',
						actionUrl: `/admin/${key}`,
					});
				}
			}
		}

		// ---- Preset vs scraped mismatch ----
		if (meta.manufacturer) {
			const presetSpecs: Partial<Record<SpecField, number>> = {
				topSpeed: meta.manufacturer.topSpeed,
				range: meta.manufacturer.range,
				batteryWh: meta.manufacturer.batteryWh,
				price: meta.manufacturer.price,
			};

			for (const [field, presetValue] of Object.entries(presetSpecs)) {
				if (!presetValue) continue;
				const fv = verification.fields[field as SpecField];
				if (!fv || fv.sources.length === 0) continue;

				const avgScraped =
					fv.sources.reduce((s, src) => s + src.value, 0) / fv.sources.length;

				if (presetValue > 0 && avgScraped > 0) {
					const diffPercent = ((avgScraped - presetValue) / presetValue) * 100;
					if (Math.abs(diffPercent) > 20) {
						alerts.push({
							id: `alert-${alertId++}`,
							severity: 'warning',
							category: 'conflict',
							scooterKey: key,
							scooterName: name,
							title: `${fieldLabel(field as SpecField)}: preset vs scraped mismatch`,
							description: `Calculator uses ${presetValue}, but scraped average is ${Math.round(avgScraped)} (${diffPercent > 0 ? '+' : ''}${Math.round(diffPercent)}% off).`,
							field: field as SpecField,
							actionLabel: 'Review',
							actionUrl: `/admin/${key}`,
						});
					}
				}
			}
		}

		// ---- Low overall confidence ----
		if (
			verification.overallConfidence > 0 &&
			verification.overallConfidence < 30 &&
			Object.keys(verification.fields).length > 0
		) {
			alerts.push({
				id: `alert-${alertId++}`,
				severity: 'warning',
				category: 'low_confidence',
				scooterKey: key,
				scooterName: name,
				title: `Low confidence (${verification.overallConfidence}%)`,
				description: `Only ${verification.overallConfidence}% confidence despite having data. Needs more sources or verification.`,
				actionLabel: 'Improve',
				actionUrl: `/admin/${key}`,
			});
		}
	}

	// ---- Sort by severity (critical → warning → info) ----
	const severityOrder: Record<AlertSeverity, number> = {
		critical: 0,
		warning: 1,
		info: 2,
	};
	alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

	// ---- Compute summary ----
	const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
	const warningCount = alerts.filter((a) => a.severity === 'warning').length;
	const infoCount = alerts.filter((a) => a.severity === 'info').length;

	const byCategory: Record<AlertCategory, number> = {
		conflict: 0,
		stale: 0,
		missing: 0,
		anomaly: 0,
		price_change: 0,
		low_confidence: 0,
		no_sources: 0,
	};
	for (const a of alerts) byCategory[a.category]++;

	// Health score: 100 = no alerts, deducted for each issue
	const totalScooters = scooterKeys.length;
	const penalty = criticalCount * 10 + warningCount * 3 + infoCount * 1;
	const maxPenalty = totalScooters * 10; // rough upper bound
	const healthScore = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));

	return {
		alerts,
		criticalCount,
		warningCount,
		infoCount,
		byCategory,
		healthScore,
		topPriority: alerts.slice(0, 10),
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
	topSpeed: 'Top Speed',
	range: 'Range',
	batteryWh: 'Battery',
	price: 'Price',
	voltage: 'Voltage',
	motorWatts: 'Motor Power',
	weight: 'Weight',
	wheelSize: 'Wheel Size',
	powerToWeight: 'Power/Weight',
};

const FIELD_UNITS: Record<string, string> = {
	topSpeed: 'km/h',
	range: 'km',
	batteryWh: 'Wh',
	price: 'USD',
	voltage: 'V',
	motorWatts: 'W',
	weight: 'kg',
	wheelSize: 'in',
};

function fieldLabel(f: string): string {
	return FIELD_LABELS[f] || f;
}

function fieldUnit(f: string): string {
	return FIELD_UNITS[f] || '';
}
