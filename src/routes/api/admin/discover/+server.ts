import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { manufacturers, getScrapableManufacturers } from '$lib/server/verification/manufacturers';
import { discoverScooters } from '$lib/server/verification/discovery';
import { logActivity } from '$lib/server/verification/activity-log';

/** Discover new scooters from a single manufacturer or all (SSE streaming) */
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { manufacturerId } = body as { manufacturerId?: string };

	const encoder = new TextEncoder();
	const targets = manufacturerId
		? manufacturers.filter((m) => m.id === manufacturerId)
		: getScrapableManufacturers();

	if (targets.length === 0) {
		throw error(400, 'No manufacturers to scan');
	}

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};

			await logActivity('discovery_started', `Discovery scan started: ${targets.length} manufacturer(s)`, {
				manufacturers: targets.map((m) => m.name),
			});

			send('start', {
				totalManufacturers: targets.length,
				manufacturers: targets.map((m) => ({ id: m.id, name: m.name })),
			});

			let totalNew = 0;
			let totalKnown = 0;
			const allResults: any[] = [];

			for (let i = 0; i < targets.length; i++) {
				const mfr = targets[i];

				send('scanning', {
					manufacturerId: mfr.id,
					name: mfr.name,
					index: i,
					total: targets.length,
				});

				const result = await discoverScooters(mfr);

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

				totalNew += result.newScooters.length;
				totalKnown += result.scooters.length - result.newScooters.length;
				allResults.push(mfrResult);

				send('manufacturer_done', mfrResult);

				// Rate limit delay between manufacturers (Gemini free tier: 15 RPM)
				if (i < targets.length - 1 && targets.length > 1) {
					await new Promise((r) => setTimeout(r, 5000));
				}
			}

			send('done', {
				totalManufacturers: targets.length,
				totalScootersFound: totalNew + totalKnown,
				totalNew,
				totalKnown,
				results: allResults,
			});

			await logActivity('discovery_completed', `Discovery done: ${totalNew + totalKnown} scooters found (${totalNew} new) across ${targets.length} manufacturer(s)`, {
				totalNew, totalKnown, totalManufacturers: targets.length,
			});

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
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	return new Response(JSON.stringify({
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
	}), {
		headers: { 'Content-Type': 'application/json' },
	});
};
