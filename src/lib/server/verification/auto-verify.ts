import { randomBytes } from 'crypto';
import type { SpecField, SourceEntry } from './types';
import { SPEC_FIELD_UNITS } from './types';
import { scrapeUrl } from './scraper';
import { getKnownSources } from './known-sources';
import { getStore, batchAddSources } from './store';

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

/** Max number of source URLs to scrape concurrently per scooter. */
const SCRAPE_BATCH_SIZE = 4;

/**
 * Auto-verify a single scooter by scraping all its known source URLs.
 * Sources are scraped in parallel batches. All extracted specs from a single
 * source URL are written to the store in one operation (one get/set per source).
 */
export async function autoVerifyScooter(
	scooterKey: string,
	onSourceDone?: (result: AutoVerifySourceResult, progress: AutoVerifyProgress) => void
): Promise<AutoVerifyProgress> {
	const sources = await getKnownSources(scooterKey);
	const progress: AutoVerifyProgress = {
		scooterKey,
		totalSources: sources.length,
		completed: 0,
		succeeded: 0,
		failed: 0,
		results: [],
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

	// Scrape one source and return its result (no store writes yet)
	const scrapeSource = async (source: (typeof sources)[number]): Promise<AutoVerifySourceResult> => {
		const result: AutoVerifySourceResult = {
			sourceName: source.name,
			url: source.url,
			success: false,
			specsFound: 0,
			extractedSpecs: {},
		};

		if (recentlyFetchedUrls.has(source.url)) {
			result.success = true;
			result.error = 'Skipped — fetched within last 24 hours';
			return result;
		}

		try {
			const scrapeResult = await scrapeUrl(scooterKey, source.url);

			if (scrapeResult.success && Object.keys(scrapeResult.extractedSpecs).length > 0) {
				result.success = true;
				result.extractedSpecs = scrapeResult.extractedSpecs;
				result.specsFound = Object.keys(scrapeResult.extractedSpecs).length;
			} else {
				result.error = scrapeResult.error || 'No specs extracted';
			}
		} catch (e) {
			result.error = e instanceof Error ? e.message : 'Unknown error';
		}

		return result;
	};

	// Process sources in parallel batches
	for (let batchStart = 0; batchStart < sources.length; batchStart += SCRAPE_BATCH_SIZE) {
		const batch = sources.slice(batchStart, batchStart + SCRAPE_BATCH_SIZE);
		const outcomes = await Promise.allSettled(batch.map(scrapeSource));

		for (let i = 0; i < outcomes.length; i++) {
			const outcome = outcomes[i];
			const source = batch[i];
			let result: AutoVerifySourceResult;

			if (outcome.status === 'fulfilled') {
				result = outcome.value;
			} else {
				result = {
					sourceName: source.name,
					url: source.url,
					success: false,
					specsFound: 0,
					extractedSpecs: {},
					error: outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error',
				};
			}

			// Write all specs from this source in a single store.set (one get/set instead of N)
			if (result.success && Object.keys(result.extractedSpecs).length > 0) {
				const fetchedAt = new Date().toISOString();
				const specEntries = Object.entries(result.extractedSpecs).map(([field, value]) => ({
					field: field as SpecField,
					source: {
						id: randomBytes(8).toString('hex'),
						type: source.type,
						name: source.name,
						url: source.url,
						value: value as number,
						unit: SPEC_FIELD_UNITS[field as SpecField] || '',
						fetchedAt,
						addedBy: 'scraper' as const,
						notes: `Auto-scraped from ${source.name}`,
					} satisfies SourceEntry,
				}));

				await batchAddSources(store, scooterKey, specEntries);
				progress.succeeded++;
			} else if (!result.success) {
				progress.failed++;
			}

			progress.completed++;
			progress.results.push(result);
			onSourceDone?.(result, { ...progress });
		}
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
