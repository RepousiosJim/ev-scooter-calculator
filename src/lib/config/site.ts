/**
 * Canonical public origin of the site, used for canonical links, og:url/og:image,
 * JSON-LD, robots.txt and the sitemap — never the request origin, which is
 * `http://sveltekit-prerender` on prerendered pages and the preview/www host on
 * other deployments. Resolved at build time by site-origin.config.js.
 */
export const SITE_URL: string = __SITE_URL__;

/** Absolute URL for a site path (`/best` → `${SITE_URL}/best`). */
export function siteUrl(path = '/'): string {
	return SITE_URL + (path.startsWith('/') ? path : `/${path}`);
}

/** Host name for display (e.g. on share images). */
export const SITE_HOST = new URL(SITE_URL).host;
