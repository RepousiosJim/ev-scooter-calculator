import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { validatePassword, createSession } from '$lib/server/auth';
import { logActivity } from '$lib/server/verification/activity-log';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;

		if (!password) {
			return fail(400, { error: 'Password is required' });
		}

		if (!validatePassword(password)) {
			return fail(401, { error: 'Invalid password' });
		}

		const token = createSession();

		cookies.set('admin_session', token, {
			path: '/',
			httpOnly: true,
			secure: false, // Set to true in production with HTTPS
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		await logActivity('login', 'Admin login successful');

		throw redirect(303, '/admin');
	}
};
