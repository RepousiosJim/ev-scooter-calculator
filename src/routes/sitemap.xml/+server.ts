import type { RequestHandler } from './$types';
import { presets, presetMetadata } from '$lib/data/presets';
import { guides } from '$lib/data/guides';

// Prerender the sitemap at build time — it is fully static (derived from presets + guides).
// Vercel will serve this from the CDN edge with zero cold starts.
export const prerender = true;

export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = url.origin;
	const lastmod = '2025-01-15';

	const pages = [
		{ path: '/', priority: '1.0', changefreq: 'weekly' },
		{ path: '/rankings', priority: '0.8', changefreq: 'weekly' },
		{ path: '/wizard', priority: '0.7', changefreq: 'monthly' },
		{ path: '/cost', priority: '0.7', changefreq: 'monthly' },
		{ path: '/guides', priority: '0.7', changefreq: 'weekly' },
		{ path: '/embed/demo', priority: '0.5', changefreq: 'monthly' },
		{ path: '/notifications', priority: '0.4', changefreq: 'monthly' },
	];

	// Add individual scooter detail pages
	for (const key of Object.keys(presets)) {
		if (key === 'custom' || !presetMetadata[key]) continue;
		pages.push({ path: `/scooter/${key}`, priority: '0.6', changefreq: 'monthly' });
	}

	// Add individual guide pages
	for (const guide of guides) {
		pages.push({ path: `/guides/${guide.slug}`, priority: '0.6', changefreq: 'monthly' });
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			// Browser: 1 hour | CDN: 1 day (sitemap content changes infrequently)
			'Cache-Control': 'public, max-age=3600, s-maxage=86400',
		},
	});
};
