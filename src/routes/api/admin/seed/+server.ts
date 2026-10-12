import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { getStore } from '$lib/server/verification/store';
import { syncCatalog } from '$lib/server/verification/catalog-sync';
import { logActivity } from '$lib/server/verification/activity-log';

/**
 * Sync the verification database with the calculator catalog: refresh each
 * scooter's catalog values, drop stale seeded copies and duplicate prices, and
 * clean up data stored under retired preset keys. Safe to run repeatedly.
 */
export const POST: RequestHandler = async ({ cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const result = await syncCatalog(await getStore());
	const message =
		`Synced ${result.updated.length} scooter(s) with the catalog` +
		(result.merged.length ? `, merged ${result.merged.length} retired key(s)` : '') +
		(result.deleted.length ? `, removed ${result.deleted.length} deleted scooter(s)` : '') +
		'.';

	await logActivity('seed_completed', message, {
		updated: result.updated.length,
		merged: result.merged,
		deleted: result.deleted,
	});

	return json({ success: true, ...result, message });
};
