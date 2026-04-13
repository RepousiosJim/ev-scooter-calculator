import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { corsResponse, applyRateLimit } from '$lib/server/api-helpers';

export const OPTIONS: RequestHandler = async () => corsResponse();

export const GET: RequestHandler = async ({ getClientAddress }) => {
	const { headers, limited } = await applyRateLimit(getClientAddress(), false);
	if (limited) return limited;

	return json(
		{
			name: 'EV Scooter Pro API',
			version: '1.0',
			description: 'Public API for electric scooter performance data and calculations',
			endpoints: [
				{
					method: 'GET',
					path: '/api/v1/scooters',
					description: 'List all scooters with computed performance and score',
					queryParams: [
						{ name: 'fields', description: 'Comma-separated sparse fieldset (e.g. name,score,price)' },
						{ name: 'sort', description: 'Sort field; prefix with - for descending (e.g. -score)' },
						{ name: 'status', description: 'Filter by status: current | discontinued | upcoming | unverified' },
					],
				},
				{
					method: 'GET',
					path: '/api/v1/scooters/:key',
					description: 'Full details for a single scooter including score breakdown, bottlenecks, and recommendations',
				},
				{
					method: 'POST',
					path: '/api/v1/calculate',
					description: 'Calculate performance for a custom scooter configuration',
					queryParams: [{ name: 'mode', description: 'Prediction mode: spec (default) | realworld' }],
				},
				{
					method: 'GET',
					path: '/api/v1/rankings',
					description: 'Ranked list of scooters',
					queryParams: [
						{ name: 'sort', description: 'score | range | speed | price | value (default: score)' },
						{ name: 'limit', description: 'Max results (default: 20, max: 100)' },
						{ name: 'offset', description: 'Pagination offset (default: 0)' },
						{ name: 'category', description: 'Filter by category: budget | commuter | performance | premium' },
					],
				},
			],
			rateLimit: '100 requests per minute',
		},
		{
			headers: {
				...headers,
				'Cache-Control': 'public, max-age=86400',
			},
		}
	);
};
