import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { scrapeUrl } from '$lib/server/verification/scraper';
import { validateScrapingUrl } from '$lib/server/verification/url-safety';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json();
	const { scooterKey, url } = body as { scooterKey: string; url: string };

	if (!scooterKey || !url) {
		throw error(400, 'Missing scooterKey or url');
	}

	const urlCheck = validateScrapingUrl(url);
	if (!urlCheck.ok) {
		throw error(400, urlCheck.reason);
	}

	const result = await scrapeUrl(scooterKey, url);
	return json(result);
};
