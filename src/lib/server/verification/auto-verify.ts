import { randomBytes } from 'crypto';
import type { SpecField, SourceEntry, ScrapeResult } from './types';
import { SPEC_FIELD_UNITS } from './types';
import { scrapeUrl } from './scraper';
import { getKnownSources } from './known-sources';
import { getStore, addSource } from './store';

export interface AutoVerifyProgress {
	scooterKey: string;
	totalSources: number;
	completed: number;
	succeeded: number;
	failed: number;
	results: AutoVerifySourceResult[];
}

export interface AutoVerifySourceResult {
	sourceName: string;
	url: string;
	success: boolean;
	specsFound: number;
	error?: string;
	extractedSpecs: Partial<Record<SpecField, number>>;
}

/**
 * Auto-verify a single scooter by scraping all its known source URLs.
 * For each source, extract specs and add them to the verification store.
 * Optional onSourceDone callback is called after each source completes (for streaming).
 */
export async function autoVerifyScooter(
	scooterKey: string,
	onSourceDone?: (result: AutoVerifySourceResult, progress: AutoVerifyProgress) => void
): Promise<AutoVerifyProgress> {
	const sources = getKnownSources(scooterKey);
	const progress: AutoVerifyProgress = {
		scooterKey,
		totalSources: sources.length,
		completed: 0,
		succeeded: 0,
		failed: 0,
		results: []
	};

	if (sources.length === 0) {
		return progress;
	}

	const store = await getStore();
	const existing = await store.get(scooterKey);

	// Build a set of URLs already fetched within the last 24 hours to avoid re-scraping
	const recentlyFetchedUrls = new Set<string>();
	if (existing) {
		const cutoff = Date.now() - 24 * 60 * 60 * 1000;
		for (const fieldData of Object.values(existing.fields)) {
			for (const s of fieldData.sources) {
				if (s.url && s.fetchedAt && new Date(s.fetchedAt).getTime() > cutoff) {
					recentlyFetchedUrls.add(s.url);
				}
			}
		}
	}

	// Scrape each known source URL
	for (const source of sources) {
		const result: AutoVerifySourceResult = {
			sourceName: source.name,
			url: source.url,
			success: false,
			specsFound: 0,
			extractedSpecs: {}
		};

		// Skip URLs already scraped within the last 24 hours
		if (recentlyFetchedUrls.has(source.url)) {
			result.success = true;
			result.error = 'Skipped — fetched within last 24 hours';
			progress.completed++;
			progress.results.push(result);
			onSourceDone?.(result, { ...progress });
			continue;
		}

		try {
			const scrapeResult = await scrapeUrl(scooterKey, source.url);

			if (scrapeResult.success && Object.keys(scrapeResult.extractedSpecs).length > 0) {
				result.success = true;
				result.extractedSpecs = scrapeResult.extractedSpecs;
				result.specsFound = Object.keys(scrapeResult.extractedSpecs).length;

				// Auto-add each extracted spec as a source entry
				for (const [field, value] of Object.entries(scrapeResult.extractedSpecs)) {
					const specField = field as SpecField;
					const sourceEntry: SourceEntry = {
						id: randomBytes(8).toString('hex'),
						type: source.type,
						name: source.name,
						url: source.url,
						value: value as number,
						unit: SPEC_FIELD_UNITS[specField] || '',
						fetchedAt: new Date().toISOString(),
						addedBy: 'scraper',
						notes: `Auto-scraped from ${source.name}`
					};

					await addSource(store, scooterKey, specField, sourceEntry);
				}

				progress.succeeded++;
			} else {
				result.error = scrapeResult.error || 'No specs extracted';
				progress.failed++;
			}
		} catch (e) {
			result.error = e instanceof Error ? e.message : 'Unknown error';
			progress.failed++;
		}

		progress.completed++;
		progress.results.push(result);
		onSourceDone?.(result, { ...progress });
	}

	return progress;
}

/**
 * Auto-verify all scooters that have known sources.
 * Returns progress for each scooter.
 */
export async function autoVerifyAll(
	onProgress?: (scooterKey: string, index: number, total: number) => void
): Promise<Record<string, AutoVerifyProgress>> {
	const { knownSources } = await import('./known-sources');
	const scooterKeys = Object.keys(knownSources);
	const results: Record<string, AutoVerifyProgress> = {};

	for (let i = 0; i < scooterKeys.length; i++) {
		const key = scooterKeys[i];
		onProgress?.(key, i, scooterKeys.length);
		results[key] = await autoVerifyScooter(key);
	}

	return results;
}
