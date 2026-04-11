import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { autoVerifyScooter } from '$lib/server/verification/auto-verify';
import { knownSources } from '$lib/server/verification/known-sources';
import { presetMetadata } from '$lib/data/presets';
import { logActivity } from '$lib/server/verification/activity-log';

/** Batch verify ALL scooters with SSE streaming progress */
export const POST: RequestHandler = async ({ cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const scooterKeys = Object.keys(knownSources);
	const totalUrls = scooterKeys.reduce((s, k) => s + knownSources[k].length, 0);
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};

			await logActivity('scan_started', `Batch scrape started: ${scooterKeys.length} scooters, ${totalUrls} URLs`);

			send('start', {
				totalScooters: scooterKeys.length,
				totalUrls
			});

			let totalSucceeded = 0;
			let totalFailed = 0;
			let scootersCompleted = 0;

			for (const key of scooterKeys) {
				const name = presetMetadata[key]?.name || key;

				send('scooter_start', {
					scooterKey: key,
					name,
					index: scootersCompleted,
					totalScooters: scooterKeys.length
				});

				const result = await autoVerifyScooter(key, (sourceResult) => {
					send('source', {
						scooterKey: key,
						sourceName: sourceResult.sourceName,
						success: sourceResult.success,
						specsFound: sourceResult.specsFound,
						error: sourceResult.error
					});
				});

				totalSucceeded += result.succeeded;
				totalFailed += result.failed;
				scootersCompleted++;

				send('scooter_done', {
					scooterKey: key,
					name,
					succeeded: result.succeeded,
					failed: result.failed,
					scootersCompleted,
					totalScooters: scooterKeys.length
				});
			}

			send('done', {
				totalScooters: scootersCompleted,
				totalSucceeded,
				totalFailed,
				totalSourcesScraped: totalSucceeded + totalFailed
			});

			await logActivity('scan_completed', `Batch scrape done: ${totalSucceeded} succeeded, ${totalFailed} failed across ${scootersCompleted} scooters`, {
				totalScooters: scootersCompleted, totalSucceeded, totalFailed
			});

			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
