import adapter from '@sveltejs/adapter-vercel';
import { resolveSiteOrigin } from './site-origin.config.js';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			// Hobby plan limits deployments to 12 serverless functions.
			// split: false bundles all routes into one function, keeping well under the limit.
			// Revisit with split: true if upgraded to Pro.
			split: false,
			maxDuration: 60,
		}),
		// Stricter policy without 'unsafe-inline' scripts, in REPORT-ONLY mode: it
		// logs violations to /api/csp-report but blocks nothing. Hash mode (not
		// nonces) because dynamic HTML is CDN-cached and nonces would be shared
		// across users. Once reports are clean, switch `reportOnly` to `directives`
		// and drop script 'unsafe-inline' from the enforced policy in hooks.server.ts.
		csp: {
			mode: 'hash',
			reportOnly: {
				'default-src': ['self'],
				'script-src': ['self', 'https://www.googletagmanager.com', 'https://www.google-analytics.com'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
				'img-src': ['self', 'data:', 'https:'],
				'connect-src': [
					'self',
					'https://*.google-analytics.com',
					'https://*.analytics.google.com',
					'https://www.googletagmanager.com',
					'https://*.google.com',
					'https://*.g.doubleclick.net',
					'https://fonts.googleapis.com',
					'https://*.supabase.co',
				],
				'report-uri': ['/api/csp-report'],
			},
		},
		prerender: {
			// url.origin during prerendering (defaults to http://sveltekit-prerender,
			// which leaked into the sitemap and canonical/og URLs of prerendered pages).
			origin: resolveSiteOrigin(),
		},
	},
};

export default config;
