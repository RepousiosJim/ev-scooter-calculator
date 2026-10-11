import { describe, it, expect } from 'vitest';
import { resolveSiteOrigin } from '../../site-origin.config.js';

describe('resolveSiteOrigin', () => {
	it('prefers an explicit PUBLIC_SITE_URL (trailing slash trimmed)', () => {
		expect(
			resolveSiteOrigin({ PUBLIC_SITE_URL: 'https://my.example/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })
		).toBe('https://my.example');
	});

	it("uses Vercel's production domain on Vercel builds", () => {
		expect(resolveSiteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'ev-scooter-calculator.vercel.app' })).toBe(
			'https://ev-scooter-calculator.vercel.app'
		);
	});

	it('falls back to the local dev server, never a hard-coded public domain', () => {
		expect(resolveSiteOrigin({})).toBe('http://localhost:3000');
	});
});
