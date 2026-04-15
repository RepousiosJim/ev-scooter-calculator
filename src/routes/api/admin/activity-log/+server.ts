import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { getActivityLog, clearActivityLog, type ActivityType } from '$lib/server/verification/activity-log';

const VALID_ACTIVITY_TYPES: readonly ActivityType[] = [
	'scan_started',
	'scan_completed',
	'scan_failed',
	'discovery_started',
	'discovery_completed',
	'discovery_failed',
	'source_added',
	'source_removed',
	'status_changed',
	'price_added',
	'seed_completed',
	'auto_fix_completed',
	'settings_changed',
	'login',
	'export',
];

export const GET: RequestHandler = async ({ cookies, url, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50') || 50, 1), 500);
	const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);
	const rawType = url.searchParams.get('type');
	const filterType =
		rawType && VALID_ACTIVITY_TYPES.includes(rawType as ActivityType) ? (rawType as ActivityType) : undefined;

	const result = await getActivityLog(limit, offset, filterType);
	return json(result);
};

export const DELETE: RequestHandler = async ({ cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	await clearActivityLog();
	return json({ success: true });
};
