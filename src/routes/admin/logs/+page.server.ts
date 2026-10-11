import type { PageServerLoad } from './$types';
import { requireAdminPage } from '$lib/server/admin-guard';
import { getActivityLog } from '$lib/server/verification/activity-log';

export const load: PageServerLoad = async ({ cookies }) => {
	await requireAdminPage({ cookies });
	const { entries, total } = await getActivityLog(100);
	return { entries, total };
};
