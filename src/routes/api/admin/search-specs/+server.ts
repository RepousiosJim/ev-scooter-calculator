import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { searchAndExtractSpecs } from '$lib/server/verification/web-search';
import { presetMetadata } from '$lib/data/presets';

/** Search the web for a scooter's specs and extract data from results */
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { scooterKey } = body as { scooterKey: string };

	if (!scooterKey || !presetMetadata[scooterKey]) {
		throw error(400, 'Invalid scooter key');
	}

	const scooterName = presetMetadata[scooterKey].name;
	const result = await searchAndExtractSpecs(scooterName, scooterKey);
	return json(result);
};
