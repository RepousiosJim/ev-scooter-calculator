import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get('admin_session');
		if (token) {
			destroySession(token);
		}
		cookies.delete('admin_session', { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
