import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { searchAndExtractSpecs } from '$lib/server/verification/web-search';
import { presetMetadata } from '$lib/data/presets';

/** Search the web for a scooter's specs and extract data from results */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json();
	const { scooterKey } = body as { scooterKey: string };

	if (!scooterKey || !presetMetadata[scooterKey]) {
		throw error(400, 'Invalid scooter key');
	}

	const scooterName = presetMetadata[scooterKey].name;
	const result = await searchAndExtractSpecs(scooterName, scooterKey);
	return json(result);
};
