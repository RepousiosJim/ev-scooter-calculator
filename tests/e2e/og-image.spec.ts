import { test, expect } from '@playwright/test';

// Social preview images must be PNG: satori can't read WOFF2 fonts, and most
// platforms reject the SVG fallback the route serves if resvg-wasm fails to load.
test.describe('OG image endpoint', () => {
	for (const query of ['', '?scooter=segway_gt3_pro']) {
		test(`GET /api/og${query} returns a PNG`, async ({ request }) => {
			const res = await request.get(`/api/og${query}`);
			expect(res.status()).toBe(200);
			expect(res.headers()['content-type']).toBe('image/png');
			const body = await res.body();
			// PNG signature
			expect(body.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
		});
	}
});
