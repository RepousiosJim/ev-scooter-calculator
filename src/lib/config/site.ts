import * as publicEnv from '$env/static/public';

/**
 * Canonical public origin of the site, used for canonical links, og:url/og:image,
 * JSON-LD and the sitemap — never the request origin, which is
 * `http://sveltekit-prerender` on prerendered pages and the preview/www host
 * on other deployments.
 *
 * Read via a namespace import: a named import of an unset static public env var
 * fails the build. Keep in sync with `kit.prerender.origin` in svelte.config.js.
 */
export const SITE_URL = (
	(publicEnv as Record<string, string | undefined>).PUBLIC_SITE_URL || 'https://evscooterpro.com'
).replace(/\/+$/, '');

/** Absolute URL for a site path (`/best` → `https://evscooterpro.com/best`). */
export function siteUrl(path = '/'): string {
	return SITE_URL + (path.startsWith('/') ? path : `/${path}`);
}
