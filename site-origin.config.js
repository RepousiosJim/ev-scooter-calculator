/**
 * The site's public origin (no trailing slash), resolved at build time and
 * shared by svelte.config.js (prerender origin) and vite.config.ts /
 * vitest.config.ts (injected into the app as __SITE_URL__).
 *
 * 1. PUBLIC_SITE_URL, if set — e.g. a custom domain.
 * 2. On Vercel, the project's production domain (VERCEL_PROJECT_PRODUCTION_URL:
 *    the shortest custom production domain, else its vercel.app domain; set on
 *    every Vercel build, previews included, so canonicals always point at
 *    production).
 * 3. Locally, the dev server.
 *
 * Never hard-code a domain here: canonical links, og:url/og:image and the
 * sitemap would point search engines at it.
 */
export function resolveSiteOrigin(env = process.env) {
	if (env.PUBLIC_SITE_URL) return env.PUBLIC_SITE_URL.replace(/\/+$/, '');
	if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
	return 'http://localhost:3000';
}
