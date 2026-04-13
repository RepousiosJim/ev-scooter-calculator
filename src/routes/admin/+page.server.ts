import type { PageServerLoad } from './$types';
import { presetMetadata } from '$lib/data/presets';
import { getStore } from '$lib/server/verification/store';
import { getActivityLog } from '$lib/server/verification/activity-log';
import { getScrapableManufacturers } from '$lib/server/verification/manufacturers';
import { knownSources } from '$lib/server/verification/known-sources';
import { generateAlerts } from '$lib/server/verification/smart-alerts';
import { env } from '$env/dynamic/private';

const SPEC_FIELDS = [
	'topSpeed',
	'range',
	'batteryWh',
	'price',
	'voltage',
	'motorWatts',
	'weight',
	'wheelSize',
] as const;

export const load: PageServerLoad = async () => {
	const store = await getStore();
	const allVerifications = await store.getAll();
	const { entries: recentActivity } = await getActivityLog(5);

	const scooters = Object.entries(presetMetadata)
		.filter(([key]) => key !== 'custom')
		.map(([key, meta]) => {
			const verification = allVerifications[key];
			const fieldCount = verification ? Object.keys(verification.fields).length : 0;
			const verifiedCount = verification
				? Object.values(verification.fields).filter((f) => f.status === 'verified').length
				: 0;
			const disputedCount = verification
				? Object.values(verification.fields).filter((f) => f.status === 'disputed').length
				: 0;
			const sourceCount = verification
				? Object.values(verification.fields).reduce((sum, f) => sum + f.sources.length, 0)
				: 0;
			const outdatedCount = verification
				? Object.values(verification.fields).filter((f) => f.status === 'outdated').length
				: 0;

			// Completeness: how many of the 8 spec fields have at least one source
			const fieldsWithData = verification
				? SPEC_FIELDS.filter((f) => verification.fields[f]?.sources?.length).length
				: 0;

			return {
				key,
				name: meta.name,
				year: meta.year,
				price: meta.manufacturer.price,
				topSpeed: meta.manufacturer.topSpeed,
				range: meta.manufacturer.range,
				batteryWh: meta.manufacturer.batteryWh,
				overallConfidence: verification?.overallConfidence ?? 0,
				fieldCount,
				verifiedCount,
				disputedCount,
				outdatedCount,
				sourceCount,
				lastUpdated: verification?.lastUpdated,
				latestPrice: verification?.priceHistory?.[0]?.price,
				completeness: Math.round((fieldsWithData / SPEC_FIELDS.length) * 100),
			};
		})
		.sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

	const totalScooters = scooters.length;
	const totalVerified = scooters.filter((s) => s.verifiedCount > 0).length;
	const totalDisputed = scooters.filter((s) => s.disputedCount > 0).length;
	const avgConfidence = scooters.length
		? Math.round(scooters.reduce((sum, s) => sum + s.overallConfidence, 0) / scooters.length)
		: 0;
	const totalSources = scooters.reduce((s, sc) => s + sc.sourceCount, 0);
	const avgCompleteness = scooters.length
		? Math.round(scooters.reduce((s, sc) => s + sc.completeness, 0) / scooters.length)
		: 0;
	const totalOutdated = scooters.filter((s) => s.outdatedCount > 0).length;
	const noDataCount = scooters.filter((s) => s.sourceCount === 0).length;

	// System health
	const geminiConfigured = !!env.GEMINI_API_KEY;
	const scrapableManufacturers = getScrapableManufacturers().length;
	const totalKnownSourceUrls = Object.values(knownSources).reduce((s, urls) => s + urls.length, 0);

	// Smart alerts summary for dashboard
	const alertSummary = generateAlerts(allVerifications);

	return {
		scooters,
		stats: {
			totalScooters,
			totalVerified,
			totalDisputed,
			avgConfidence,
			totalSources,
			avgCompleteness,
			totalOutdated,
			noDataCount,
		},
		systemHealth: {
			geminiConfigured,
			scrapableManufacturers,
			totalKnownSourceUrls,
			scootersWithSources: Object.keys(knownSources).length,
		},
		recentActivity,
		alerts: {
			critical: alertSummary.criticalCount,
			warning: alertSummary.warningCount,
			total: alertSummary.alerts.length,
			healthScore: alertSummary.healthScore,
			topPriority: alertSummary.topPriority.slice(0, 5),
		},
	};
};
