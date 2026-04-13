import { error } from '@sveltejs/kit';
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
 * Rate limit admin API endpoints (60 req/min per IP).
 * Throws 429 if exceeded.
 */
export async function rateLimit(event: Pick<RequestEvent, 'getClientAddress'>) {
	const result = await checkRateLimit(event.getClientAddress(), RATE_LIMIT_ADMIN);
	if (!result.allowed) {
		throw error(429, 'Too many requests');
	}
}
