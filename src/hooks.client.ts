import type { HandleClientError } from '@sveltejs/kit';
import { SENTRY_DSN } from '$lib/sentry';

// Sentry (~46 KB gzipped) is loaded lazily, and only when a DSN is configured,
// so it is no longer part of every page's startup JavaScript. Errors thrown
// before it finishes loading are still reported: handleError awaits the import.
type SentryModule = typeof import('@sentry/sveltekit');
let sentry: Promise<SentryModule> | null = null;

function loadSentry(): Promise<SentryModule> | null {
	if (!SENTRY_DSN) return null;
	sentry ??= import('@sentry/sveltekit').then((Sentry) => {
		Sentry.init({
			dsn: SENTRY_DSN,
			tracesSampleRate: 0.1,
		});
		return Sentry;
	});
	return sentry;
}

if (SENTRY_DSN && typeof window !== 'undefined') {
	const start = () => void loadSentry();
	if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 5000 });
	else setTimeout(start, 2000);
}

export const handleError: HandleClientError = ({ error }) => {
	void loadSentry()?.then((Sentry) => Sentry.captureException(error));
};
