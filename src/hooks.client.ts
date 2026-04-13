import * as Sentry from '@sentry/sveltekit';
import { SENTRY_DSN } from '$lib/sentry';

if (SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		tracesSampleRate: 0.1,
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 1.0,
	});
}

export const handleError = Sentry.handleErrorWithSentry();
