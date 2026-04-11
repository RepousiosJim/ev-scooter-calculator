import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getActivityLog, clearActivityLog } from '$lib/server/verification/activity-log';

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const type = url.searchParams.get('type') || undefined;

	const result = await getActivityLog(limit, offset, type as any);
	return json(result);
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	await clearActivityLog();
	return json({ success: true });
};
