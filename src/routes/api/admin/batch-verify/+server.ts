import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { autoVerifyScooter } from '$lib/server/verification/auto-verify';
import { knownSources } from '$lib/server/verification/known-sources';
import { presetMetadata } from '$lib/data/presets';
import { logActivity } from '$lib/server/verification/activity-log';

/** Max number of scooters to verify concurrently. */
const BATCH_SIZE = 5;

/** Batch verify ALL scooters with SSE streaming progress */
export const POST: RequestHandler = async ({ cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const scooterKeys = Object.keys(knownSources);
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
				await logActivity('scan_started', `Batch scrape started: ${scooterKeys.length} scooters, ${totalUrls} URLs`);

				send('start', {
					totalScooters: scooterKeys.length,
					totalUrls,
				});

				let totalSucceeded = 0;
				let totalFailed = 0;
				let scootersCompleted = 0;

				// Process scooters in parallel batches
				for (let batchStart = 0; batchStart < scooterKeys.length; batchStart += BATCH_SIZE) {
					if (cancelled) break;

					const batch = scooterKeys.slice(batchStart, batchStart + BATCH_SIZE);

					const batchPromises = batch.map(async (key, batchIndex) => {
						const index = batchStart + batchIndex;
						const name = presetMetadata[key]?.name || key;

						send('scooter_start', {
							scooterKey: key,
							name,
							index,
							totalScooters: scooterKeys.length,
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
							totalScooters: scooterKeys.length,
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

				send('done', {
					totalScooters: scootersCompleted,
					totalSucceeded,
					totalFailed,
					totalSourcesScraped: totalSucceeded + totalFailed,
				});

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
