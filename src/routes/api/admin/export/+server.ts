import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin-guard';
import { getStore } from '$lib/server/verification/store';
import type { ScooterVerification } from '$lib/server/verification/types';
import { logActivity } from '$lib/server/verification/activity-log';

function isValidScooterVerification(value: unknown): value is ScooterVerification {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.scooterKey === 'string' &&
		typeof v.fields === 'object' &&
		v.fields !== null &&
		Array.isArray(v.priceHistory) &&
		typeof v.lastUpdated === 'string' &&
		typeof v.overallConfidence === 'number'
	);
}

export const GET: RequestHandler = async ({ cookies }) => {
	await requireAdmin({ cookies });

	const store = await getStore();
	const allData = await store.getAll();

	await logActivity('export', `Exported ${Object.keys(allData).length} scooter verifications`);

	return json({
		exportedAt: new Date().toISOString(),
		scooterCount: Object.keys(allData).length,
		data: allData,
	});
};

/** Import verification data */
export const POST: RequestHandler = async ({ request, cookies }) => {
	await requireAdmin({ cookies });

	const body = await request.json();
	if (!body.data || typeof body.data !== 'object') {
		throw error(400, 'Invalid import format. Expected { data: { ... } }');
	}

	const store = await getStore();
	let imported = 0;

	for (const [key, value] of Object.entries(body.data)) {
		if (!isValidScooterVerification(value)) continue;
		await store.set(key, value);
		imported++;
	}

	await logActivity('seed_completed', `Imported ${imported} scooter verifications from file`);

	return json({ success: true, imported });
};
