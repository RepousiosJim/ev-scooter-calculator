import type { RequestHandler } from './$types';
import { SITE_URL } from '$lib/config/site';

// Generated (not a static file) so the sitemap URL follows the deployment's real
// domain instead of a hard-coded one.
export const prerender = true;

export const GET: RequestHandler = () => {
	const body = [
		'User-agent: *',
		'Disallow: /admin/',
		// Share images must stay crawlable: social crawlers such as Twitterbot obey robots.txt.
		'Allow: /api/og',
		'Disallow: /api/',
		'',
		`Sitemap: ${SITE_URL}/sitemap.xml`,
		'',
	].join('\n');
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
