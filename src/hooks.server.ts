import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';
import { runAutoFix } from '$lib/server/verification/auto-fix';
import { recoverOrphanedRuns } from '$lib/server/verification/discovery-store';
import { logger } from '$lib/server/logger';

// ---------------------------------------------------------------------------
// Sentry — server-side (only initialised when SENTRY_DSN is set)
// ---------------------------------------------------------------------------
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: 0.1,
	});
}

export const handleError = Sentry.handleErrorWithSentry();

// ---------------------------------------------------------------------------
// Startup: auto-seed + recover orphaned discovery runs (runs once)
// ---------------------------------------------------------------------------
let startupFixPromise: Promise<void> | null = null;

async function runStartupFix() {
	try {
		// Recover any discovery runs stuck in 'running' status (server crash recovery)
		const recovered = await recoverOrphanedRuns();
		if (recovered > 0) {
			logger.info({ recovered }, 'Recovered orphaned discovery runs');
		}

		// Seed missing verification data + remove anomalies (non-destructive)
		const result = await runAutoFix(['seed', 'anomalies']);
		if (result.summary.totalActions > 0) {
			logger.info(
				{
					totalActions: result.summary.totalActions,
					scootersSeeded: result.summary.scootersSeeded,
					anomaliesFixed: result.summary.anomaliesFixed,
					durationMs: result.duration,
				},
				'Startup auto-fix completed'
			);
		}
	} catch (e) {
		logger.error({ err: e }, 'Startup auto-fix failed');
	}
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export const handle: Handle = async ({ event, resolve }) => {
	// Attach a unique request ID to every request for structured logging
	const requestId = crypto.randomUUID();
	event.locals.requestId = requestId;

	const start = Date.now();
	const { method } = event.request;
	const { pathname } = event.url;

	const isAdminOrApi = pathname.startsWith('/admin') || pathname.startsWith('/api');
	if (isAdminOrApi) {
		logger.info({ requestId, method, pathname }, 'Request started');
	}

	// Run startup fix once and await it so admin routes see consistent data.
	// The promise is cached, so subsequent requests don't re-run or re-await.
	if (!startupFixPromise) {
		startupFixPromise = runStartupFix();
	}

	// Admin routes wait for startup to complete; public routes don't block.
	if (event.url.pathname.startsWith('/admin') || event.url.pathname.startsWith('/api/admin')) {
		await startupFixPromise;
	}

	// Guard all /admin page routes except /admin/login
	if (event.url.pathname.startsWith('/admin') && !event.url.pathname.startsWith('/admin/login')) {
		const sessionToken = event.cookies.get('admin_session');
		if (!(await validateSession(sessionToken))) {
			throw redirect(303, '/admin/login');
		}
	}

	// Guard all /api/admin/* routes — defense-in-depth so a new handler
	// without requireAdmin() is never silently unprotected.
	if (event.url.pathname.startsWith('/api/admin')) {
		const sessionToken = event.cookies.get('admin_session');
		if (!(await validateSession(sessionToken))) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"font-src 'self' https://fonts.gstatic.com data:",
			"img-src 'self' data: https:",
			"connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.supabase.co",
			"frame-ancestors 'none'",
		].join('; ')
	);

	// Performance: HTTP Link preconnect hints for font + analytics origins.
	// Sent as response headers so Vercel edge can forward them as Early Hints (103)
	// before the full HTML response is ready, shaving ~100–200 ms off TTFB perception.
	// Only apply to HTML page responses (not API routes or admin routes).
	const contentType = response.headers.get('content-type') ?? '';
	if (!isAdminOrApi && contentType.includes('text/html')) {
		const hints = [
			'<https://fonts.googleapis.com>; rel="preconnect"',
			'<https://fonts.gstatic.com>; rel="preconnect"; crossorigin',
			'<https://www.googletagmanager.com>; rel="dns-prefetch"',
		].join(', ');
		const existing = response.headers.get('Link');
		response.headers.set('Link', existing ? `${existing}, ${hints}` : hints);
	}

	// HSTS: Vercel always terminates TLS, so the server is always behind HTTPS in
	// production. Setting HSTS unconditionally here avoids relying on the protocol
	// sniff (which is always 'http:' behind Vercel's proxy on some versions).
	if (process.env.NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	}

	const durationMs = Date.now() - start;
	if (isAdminOrApi || response.status >= 400 || durationMs > 500) {
		logger.info({ requestId, method, pathname, status: response.status, durationMs }, 'Request completed');
	}

	return response;
};
