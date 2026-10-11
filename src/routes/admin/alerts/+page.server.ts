import type { PageServerLoad } from './$types';
import { requireAdminPage } from '$lib/server/admin-guard';
import { getStore } from '$lib/server/verification/store';
import { generateAlerts } from '$lib/server/verification/smart-alerts';
import { getChangelog } from '$lib/server/verification/changelog';

export const load: PageServerLoad = async ({ cookies }) => {
	await requireAdminPage({ cookies });
	const store = await getStore();
	const allVerifications = await store.getAll();
	const alertSummary = generateAlerts(allVerifications);
	const { entries: recentChanges, total: totalChanges } = await getChangelog(30);

	return {
		alertSummary,
		recentChanges,
		totalChanges,
	};
};
