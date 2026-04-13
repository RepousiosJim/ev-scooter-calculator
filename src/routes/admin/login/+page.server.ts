import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { validatePassword, createSession } from '$lib/server/auth';
import { logActivity } from '$lib/server/verification/activity-log';
import { checkRateLimit } from '$lib/server/rate-limit';

// Tight limit: 10 login attempts per minute per IP
const LOGIN_RATE_LIMIT = 10;

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const rl = await checkRateLimit(getClientAddress(), LOGIN_RATE_LIMIT);
		if (!rl.allowed) {
			return fail(429, { error: 'Too many login attempts. Please wait before trying again.' });
		}

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
			secure: new URL(request.url).protocol === 'https:',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24, // 24 hours
		});

		await logActivity('login', 'Admin login successful');

		throw redirect(303, '/admin');
	},
};
