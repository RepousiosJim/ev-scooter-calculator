import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { manufacturers, getScrapableManufacturers } from '$lib/server/verification/manufacturers';
import { discoverScooters, type DiscoveredScooter } from '$lib/server/verification/discovery';
import { logActivity } from '$lib/server/verification/activity-log';
import {
	createRun,
	completeRun,
	failRun,
	addEntries,
	updateUrlHealth,
	type DiscoveryEntry,
} from '$lib/server/verification/discovery-store';
import { onDiscoveryComplete } from '$lib/server/verification/pipeline-actions';
import { randomBytes } from 'crypto';

/** Discover new scooters from a single manufacturer or all (SSE streaming) */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json();
	const { manufacturerId, autoPromote = true } = body as {
		manufacturerId?: string;
		autoPromote?: boolean;
	};

	const encoder = new TextEncoder();
	const targets = manufacturerId ? manufacturers.filter((m) => m.id === manufacturerId) : getScrapableManufacturers();

	if (targets.length === 0) {
		throw error(400, 'No manufacturers to scan');
	}

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};

			// Create a persistent discovery run
			const run = await createRun(targets.map((m) => m.id));

			await logActivity('discovery_started', `Discovery scan started: ${targets.length} manufacturer(s)`, {
				manufacturers: targets.map((m) => m.name),
				runId: run.id,
			});

			send('start', {
				runId: run.id,
				totalManufacturers: targets.length,
				manufacturers: targets.map((m) => ({ id: m.id, name: m.name })),
			});

			type MfrResult = {
				manufacturerId: string;
				name: string;
				totalFound: number;
				newCount: number;
				knownCount: number;
				scooters: DiscoveredScooter[];
				newScooters: DiscoveredScooter[];
				errors: string[];
				deadUrls: string[];
				methods: string[];
			};
			let totalNew = 0;
			let totalKnown = 0;
			const allResults: MfrResult[] = [];
			const allNewScooters: DiscoveredScooter[] = [];
			const allErrors: string[] = [];

			// Process one manufacturer: discover, persist, emit SSE event
			const processManufacturer = async (mfr: (typeof targets)[number], index: number) => {
				send('scanning', {
					manufacturerId: mfr.id,
					name: mfr.name,
					index,
					total: targets.length,
				});

				const result = await discoverScooters(mfr);

				// Track URL health for each URL attempted
				for (const url of result.scannedUrls) {
					await updateUrlHealth(url, 200, undefined, result.scooters.length);
				}
				for (const url of result.deadUrls) {
					await updateUrlHealth(url, 404, 'Page not found or unreachable');
				}

				// Persist discovered entries
				const entries: DiscoveryEntry[] = result.scooters.map((s) => ({
					id: randomBytes(8).toString('hex'),
					name: s.name,
					url: s.url,
					manufacturer: s.manufacturer,
					manufacturerId: s.manufacturerId || mfr.id,
					specs: s.specs,
					isKnown: s.isKnown,
					matchedKey: s.matchedKey,
					year: s.year,
					extractionMethod: s.extractionMethod,
					discoveryRunId: run.id,
					discoveredAt: new Date().toISOString(),
					candidateKey: undefined,
					disposition: null,
				}));

				if (entries.length > 0) {
					await addEntries(entries);
				}

				const mfrResult = {
					manufacturerId: mfr.id,
					name: mfr.name,
					totalFound: result.scooters.length,
					newCount: result.newScooters.length,
					knownCount: result.scooters.length - result.newScooters.length,
					scooters: result.scooters,
					newScooters: result.newScooters,
					errors: result.errors,
					deadUrls: result.deadUrls,
					methods: result.methods,
				};

				send('manufacturer_done', mfrResult);
				return mfrResult;
			};

			// Split targets into batches and run each batch in parallel
			const BATCH_SIZE = 5;
			const BATCH_DELAY_MS = 2000;

			try {
				for (let batchStart = 0; batchStart < targets.length; batchStart += BATCH_SIZE) {
					const batch = targets.slice(batchStart, batchStart + BATCH_SIZE);

					const batchPromises = batch.map((mfr, batchIndex) => processManufacturer(mfr, batchStart + batchIndex));

					const batchOutcomes = await Promise.allSettled(batchPromises);

					for (const outcome of batchOutcomes) {
						if (outcome.status === 'fulfilled') {
							const mfrResult = outcome.value;
							totalNew += mfrResult.newCount;
							totalKnown += mfrResult.knownCount;
							allResults.push(mfrResult);
							allNewScooters.push(...mfrResult.newScooters);
							allErrors.push(...mfrResult.errors);
						} else {
							// Per-manufacturer failure: record error but continue
							const msg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
							allErrors.push(msg);
						}
					}

					// Rate-limit delay between batches (be polite to target servers)
					const isLastBatch = batchStart + BATCH_SIZE >= targets.length;
					if (!isLastBatch) {
						await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
					}
				}

				// Auto-promote new scooters to candidates
				let candidatesCreated = 0;
				if (autoPromote && allNewScooters.length > 0) {
					const promotionResult = await onDiscoveryComplete(run.id, allNewScooters);
					candidatesCreated = promotionResult.candidatesCreated;
				}

				// Complete the run with stats
				await completeRun(run.id, {
					totalFound: totalNew + totalKnown,
					totalNew,
					totalKnown,
					candidatesCreated,
					errors: allErrors,
				});

				send('done', {
					runId: run.id,
					totalManufacturers: targets.length,
					totalScootersFound: totalNew + totalKnown,
					totalNew,
					totalKnown,
					candidatesCreated,
					autoPromoted: autoPromote,
					results: allResults,
				});

				await logActivity(
					'discovery_completed',
					`Discovery done: ${totalNew + totalKnown} found (${totalNew} new, ${candidatesCreated} candidates created) across ${targets.length} manufacturer(s)`,
					{
						runId: run.id,
						totalNew,
						totalKnown,
						candidatesCreated,
						totalManufacturers: targets.length,
					}
				);
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error';
				await failRun(run.id, msg);
				send('error', { error: msg, runId: run.id });
			}

			controller.close();
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};

/** GET: Return manufacturer registry */
export const GET: RequestHandler = async ({ cookies }) => {
	await requireAdmin({ cookies });

	return new Response(
		JSON.stringify({
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
			scrapableCount: getScrapableManufacturers().length,
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
