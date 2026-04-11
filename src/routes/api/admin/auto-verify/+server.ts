import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { autoVerifyScooter } from '$lib/server/verification/auto-verify';
import { getKnownSources } from '$lib/server/verification/known-sources';
import { presetMetadata } from '$lib/data/presets';

/** Auto-verify a single scooter with SSE streaming progress */
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { scooterKey } = body as { scooterKey: string };

	if (!scooterKey || !presetMetadata[scooterKey]) {
		throw error(400, 'Invalid scooter key');
	}

	const sources = getKnownSources(scooterKey);
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};

			send('start', {
				scooterKey,
				name: presetMetadata[scooterKey].name,
				totalSources: sources.length
			});

			const result = await autoVerifyScooter(scooterKey, (sourceResult, progress) => {
				send('source', {
					sourceName: sourceResult.sourceName,
					success: sourceResult.success,
					specsFound: sourceResult.specsFound,
					error: sourceResult.error,
					completed: progress.completed,
					total: progress.totalSources
				});
			});

			send('done', {
				totalSources: result.totalSources,
				succeeded: result.succeeded,
				failed: result.failed,
				results: result.results
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
