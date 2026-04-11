import type { PageServerLoad } from './$types';
import { getActivityLog } from '$lib/server/verification/activity-log';

export const load: PageServerLoad = async () => {
	const { entries, total } = await getActivityLog(100);
	return { entries, total };
};
