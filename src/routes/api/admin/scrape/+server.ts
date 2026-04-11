import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { scrapeUrl } from '$lib/server/verification/scraper';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { scooterKey, url } = body as { scooterKey: string; url: string };

	if (!scooterKey || !url) {
		throw error(400, 'Missing scooterKey or url');
	}

	try {
		new URL(url); // Validate URL
	} catch {
		throw error(400, 'Invalid URL');
	}

	const result = await scrapeUrl(scooterKey, url);
	return json(result);
};
