import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getStore } from '$lib/server/verification/store';
import { logActivity } from '$lib/server/verification/activity-log';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const store = await getStore();
	const allData = await store.getAll();

	await logActivity('export', `Exported ${Object.keys(allData).length} scooter verifications`);

	return json({
		exportedAt: new Date().toISOString(),
		scooterCount: Object.keys(allData).length,
		data: allData
	});
};

/** Import verification data */
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	if (!body.data || typeof body.data !== 'object') {
		throw error(400, 'Invalid import format. Expected { data: { ... } }');
	}

	const store = await getStore();
	let imported = 0;

	for (const [key, value] of Object.entries(body.data)) {
		if (value && typeof value === 'object' && 'scooterKey' in (value as any)) {
			await store.set(key, value as any);
			imported++;
		}
	}

	await logActivity('seed_completed', `Imported ${imported} scooter verifications from file`);

	return json({ success: true, imported });
};
