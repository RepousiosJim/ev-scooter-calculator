import type { PageServerLoad } from './$types';
import { logger } from '$lib/server/logger';
import { getCandidates, getCandidateStats } from '$lib/server/verification/candidate-store';
import { getStore } from '$lib/server/verification/store';
import { generateAlerts } from '$lib/server/verification/smart-alerts';
import { presetMetadata } from '$lib/data/presets';
import { getScrapableManufacturers, manufacturers } from '$lib/server/verification/manufacturers';
import {
	getRecentRuns,
	getUnreviewedEntries,
	getStats as getDiscoveryStats,
	getUrlHealth,
	type DiscoveryRun,
	type DiscoveryEntry,
} from '$lib/server/verification/discovery-store';
import type { PresetCandidate } from '$lib/server/verification/preset-generator';

export const load: PageServerLoad = async () => {
	// --- Discovery section ---
	let discovery = {
		recentRuns: [] as DiscoveryRun[],
		unreviewedEntries: [] as DiscoveryEntry[],
		stats: {
			totalManufacturers: 0,
			scrapableCount: 0,
			totalRuns: 0,
			totalEntries: 0,
			pendingReview: 0,
		},
		urlHealth: { healthy: 0, dead: 0, total: 0 },
	};
	try {
		const scrapable = getScrapableManufacturers();
		const recentRuns = await getRecentRuns(5);
		const unreviewedEntries = await getUnreviewedEntries();
		const dStats = await getDiscoveryStats();
		const urlHealthMap = await getUrlHealth();
		const healthEntries = Object.values(urlHealthMap);

		discovery = {
			recentRuns,
			unreviewedEntries,
			stats: {
				totalManufacturers: manufacturers.length,
				scrapableCount: scrapable.length,
				totalRuns: dStats.totalRuns,
				totalEntries: dStats.totalEntries,
				pendingReview: dStats.pendingReview,
			},
			urlHealth: {
				healthy: healthEntries.filter((h) => !h.isDisabled && h.consecutiveFailures < 3).length,
				dead: healthEntries.filter((h) => h.isDisabled || h.consecutiveFailures >= 3).length,
				total: healthEntries.length,
			},
		};
	} catch (e) {
		logger.error({ err: e }, 'Pipeline: discovery load failed');
	}

	// --- Candidates section ---
	let candidates = {
		all: [] as PresetCandidate[],
		stats: { total: 0, pending: 0, approved: 0, rejected: 0, avgConfidence: 0 },
		pending: [] as PresetCandidate[],
		approved: [] as PresetCandidate[],
		rejected: [] as PresetCandidate[],
	};
	try {
		const all = await getCandidates();
		const stats = await getCandidateStats();
		candidates = {
			all,
			stats,
			pending: all.filter((c) => c.status === 'pending'),
			approved: all.filter((c) => c.status === 'approved'),
			rejected: all.filter((c) => c.status === 'rejected'),
		};
	} catch (e) {
		logger.error({ err: e }, 'Pipeline: candidates load failed');
	}

	// --- Catalog section ---
	const catalog = {
		totalScooters: Object.keys(presetMetadata).filter((k) => k !== 'custom').length,
	};

	// --- Alerts section ---
	let alerts = {
		critical: 0,
		warning: 0,
		total: 0,
		healthScore: 100,
	};
	try {
		const store = await getStore();
		const allVerifications = await store.getAll();
		const summary = generateAlerts(allVerifications);
		alerts = {
			critical: summary.criticalCount,
			warning: summary.warningCount,
			total: summary.alerts.length,
			healthScore: summary.healthScore,
		};
	} catch (e) {
		logger.error({ err: e }, 'Pipeline: alerts load failed');
	}

	return {
		discovery,
		candidates,
		catalog,
		alerts,
	};
};
