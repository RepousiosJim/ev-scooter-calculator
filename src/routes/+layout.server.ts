import type { LayoutServerLoad } from './$types';

/**
 * Sets cache headers for all public HTML responses served through this layout.
 * - Browser: no local cache (always revalidate with server/CDN)
 * - CDN/Vercel edge: serve cached response for up to 60 s, then revalidate in background
 *
 * Admin routes override this with `Cache-Control: private, no-store` in their own
 * +layout.server.ts, so this only applies to public pages (/, /rankings).
 */
export const load: LayoutServerLoad = ({ setHeaders, url }) => {
	// Skip setting public cache headers for admin routes — their layout overrides this,
	// but being explicit here avoids any risk of a missed override.
	if (!url.pathname.startsWith('/admin')) {
		setHeaders({
			'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
		});
	}
};
