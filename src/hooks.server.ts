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

	logger.info({ requestId, method, pathname }, 'Request started');

	// Run startup fix once and await it so admin routes see consistent data.
	// The promise is cached, so subsequent requests don't re-run or re-await.
	if (!startupFixPromise) {
		startupFixPromise = runStartupFix();
	}

	// Admin routes wait for startup to complete; public routes don't block.
	if (event.url.pathname.startsWith('/admin') || event.url.pathname.startsWith('/api/admin')) {
		await startupFixPromise;
	}

	// Guard all /admin routes except /admin/login
	if (event.url.pathname.startsWith('/admin') && !event.url.pathname.startsWith('/admin/login')) {
		const sessionToken = event.cookies.get('admin_session');
		if (!(await validateSession(sessionToken))) {
			throw redirect(303, '/admin/login');
		}
	}

	const response = await resolve(event);

	logger.info(
		{ requestId, method, pathname, status: response.status, durationMs: Date.now() - start },
		'Request completed'
	);

	return response;
};
