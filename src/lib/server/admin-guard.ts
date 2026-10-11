import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { validateSession } from './auth';
import { checkRateLimit, RATE_LIMIT_ADMIN } from './rate-limit';

/**
 * Validate admin session from request cookies.
 * Throws 401 if not authenticated.
 * Use at the top of every admin API handler.
 */
export async function requireAdmin(event: Pick<RequestEvent, 'cookies'>) {
	if (!(await validateSession(event.cookies.get('admin_session')))) {
		throw error(401, 'Unauthorized');
	}
}

/**
 * Validate the admin session for an admin page `load`.
 * Redirects to the login page if not authenticated.
 *
 * Call at the top of every admin `+page.server.ts` load. The hook guards these
 * routes too, but leaf loads must not rely on the parent layout's check:
 * SvelteKit skips layout loads on client-side invalidation requests
 * (`x-sveltekit-invalidated`), so a layout-only guard can be bypassed.
 */
export async function requireAdminPage(event: Pick<RequestEvent, 'cookies'>) {
	if (!(await validateSession(event.cookies.get('admin_session')))) {
		throw redirect(303, '/admin/login');
	}
}

/**
 * Rate limit admin API endpoints (60 req/min per IP).
 * Throws 429 if exceeded.
 */
export async function rateLimit(event: Pick<RequestEvent, 'getClientAddress'>) {
	const result = await checkRateLimit(event.getClientAddress(), RATE_LIMIT_ADMIN);
	if (!result.allowed) {
		throw error(429, 'Too many requests');
	}
}
