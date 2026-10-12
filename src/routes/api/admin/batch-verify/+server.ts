import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';

// Vercel Hobby plan max: 60 s
export const config = { maxDuration: 60 };
import { autoVerifyScooter } from '$lib/server/verification/auto-verify';
import { knownSources } from '$lib/server/verification/known-sources';
import { presetMetadata } from '$lib/data/presets';
import { logActivity } from '$lib/server/verification/activity-log';

/** Max number of scooters to verify concurrently. */
const BATCH_SIZE = 5;

/**
 * Stop starting new batches after this long so the response finishes inside
 * Vercel's 60 s limit. The client calls again with `offset: nextOffset`.
 */
const TIME_BUDGET_MS = 40_000;

/** Batch verify scooters with SSE streaming progress, in time-boxed chunks. */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json().catch(() => ({}));
	const offset = Number.isInteger(body?.offset) && body.offset > 0 ? body.offset : 0;
	const startedAt = Date.now();

	// Only scooters that have at least one URL to scrape.
	const allKeys = Object.keys(knownSources).filter((k) => knownSources[k].length > 0);
	const scooterKeys = allKeys.slice(offset);
	const totalUrls = scooterKeys.reduce((s, k) => s + knownSources[k].length, 0);
	const encoder = new TextEncoder();

	let cancelled = false;

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				if (cancelled) return;
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};

			try {
				if (offset === 0) {
					await logActivity('scan_started', `Batch scrape started: ${allKeys.length} scooters`);
				}

				send('start', {
					totalScooters: allKeys.length,
					offset,
					totalUrls,
				});

				let totalSucceeded = 0;
				let totalFailed = 0;
				let scootersCompleted = 0;

				// Process scooters in parallel batches
				let batchStart = 0;
				for (; batchStart < scooterKeys.length; batchStart += BATCH_SIZE) {
					if (cancelled) break;
					if (batchStart > 0 && Date.now() - startedAt > TIME_BUDGET_MS) break;

					const batch = scooterKeys.slice(batchStart, batchStart + BATCH_SIZE);

					const batchPromises = batch.map(async (key, batchIndex) => {
						const index = offset + batchStart + batchIndex;
						const name = presetMetadata[key]?.name || key;

						send('scooter_start', {
							scooterKey: key,
							name,
							index,
							totalScooters: allKeys.length,
						});

						const result = await autoVerifyScooter(key, (sourceResult) => {
							send('source', {
								scooterKey: key,
								sourceName: sourceResult.sourceName,
								success: sourceResult.success,
								specsFound: sourceResult.specsFound,
								error: sourceResult.error,
							});
						});

						send('scooter_done', {
							scooterKey: key,
							name,
							succeeded: result.succeeded,
							failed: result.failed,
							scootersCompleted: index + 1,
							totalScooters: allKeys.length,
						});

						return result;
					});

					const outcomes = await Promise.allSettled(batchPromises);

					for (const outcome of outcomes) {
						if (outcome.status === 'fulfilled') {
							totalSucceeded += outcome.value.succeeded;
							totalFailed += outcome.value.failed;
						}
						scootersCompleted++;
					}
				}

				const processed = Math.min(batchStart, scooterKeys.length);
				const nextOffset = offset + processed < allKeys.length && !cancelled ? offset + processed : null;

				send('done', {
					totalScooters: scootersCompleted,
					totalSucceeded,
					totalFailed,
					totalSourcesScraped: totalSucceeded + totalFailed,
					nextOffset,
				});

				if (nextOffset !== null) return;
				await logActivity(
					'scan_completed',
					`Batch scrape done: ${totalSucceeded} succeeded, ${totalFailed} failed across ${scootersCompleted} scooters`,
					{
						totalScooters: scootersCompleted,
						totalSucceeded,
						totalFailed,
					}
				);
			} finally {
				if (!cancelled) controller.close();
			}
		},
		cancel() {
			cancelled = true;
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
