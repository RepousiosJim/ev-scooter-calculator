import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Guard all /admin routes except /admin/login
	if (event.url.pathname.startsWith('/admin') && !event.url.pathname.startsWith('/admin/login')) {
		const sessionToken = event.cookies.get('admin_session');
		if (!validateSession(sessionToken)) {
			throw redirect(303, '/admin/login');
		}
	}

	return resolve(event);
};
