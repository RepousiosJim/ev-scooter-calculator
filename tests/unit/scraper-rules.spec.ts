/**
 * Unit tests for scraper-rules.ts
 * Tests the getScraperRules() lookup and getAllRulesets() helper.
 */
import { describe, it, expect } from 'vitest';
import { getScraperRules, getAllRulesets } from '$lib/server/verification/scraper-rules';

// ---------------------------------------------------------------------------
// getScraperRules – known domains
// ---------------------------------------------------------------------------

describe('getScraperRules – known domains', () => {
	it('returns rules for voromotors.com', () => {
		const rules = getScraperRules('https://www.voromotors.com/collections/scooters');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Shopify Retailers');
	});

	it('returns rules for revrides.com', () => {
		const rules = getScraperRules('https://revrides.com/products/ninebot-max');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Shopify Retailers');
	});

	it('returns rules for fluidfreeride.com', () => {
		const rules = getScraperRules('https://fluidfreeride.com/products/xiaomi-pro');
		expect(rules).not.toBeNull();
	});

	it('returns rules for rfriders.com', () => {
		const rules = getScraperRules('https://rfriders.com/products/test');
		expect(rules).not.toBeNull();
	});

	it('returns rules for store.segway.com', () => {
		const rules = getScraperRules('https://store.segway.com/ninebot-max-g2');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Segway-Ninebot');
	});

	it('returns rules for segway.com (non-store subdomain)', () => {
		const rules = getScraperRules('https://www.segway.com/products/');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Segway-Ninebot');
	});

	it('returns rules for electric-scooter.guide', () => {
		const rules = getScraperRules('https://electric-scooter.guide/reviews/ninebot-max');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Electric Scooter Guide');
	});

	it('returns rules for gotrax.com', () => {
		const rules = getScraperRules('https://www.gotrax.com/products/xr-ultra');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Gotrax');
	});

	it('returns rules for hiboy.com', () => {
		const rules = getScraperRules('https://hiboy.com/products/hiboy-s2');
		expect(rules).not.toBeNull();
		expect(rules!.manufacturer).toBe('Hiboy');
	});
});

// ---------------------------------------------------------------------------
// getScraperRules – unknown domains
// ---------------------------------------------------------------------------

describe('getScraperRules – unknown domains', () => {
	it('returns null for an unknown domain', () => {
		const rules = getScraperRules('https://unknown-scooter-shop.com/products/foo');
		expect(rules).toBeNull();
	});

	it('returns null for a completely unrelated URL', () => {
		expect(getScraperRules('https://google.com')).toBeNull();
	});

	it('returns null for an empty string', () => {
		expect(getScraperRules('')).toBeNull();
	});

	it('returns null for a non-URL string', () => {
		expect(getScraperRules('not a url at all')).toBeNull();
	});

	it('returns null for a localhost URL', () => {
		expect(getScraperRules('http://localhost:3000/products')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getScraperRules – rule structure validation
// ---------------------------------------------------------------------------

describe('getScraperRules – rule structure', () => {
	it('every rule has a cssSelector for price on shopify retailers', () => {
		const rules = getScraperRules('https://www.voromotors.com/');
		expect(rules!.selectors.price?.cssSelector).toBeTruthy();
	});

	it('Electric Scooter Guide has selectors for topSpeed and range', () => {
		const rules = getScraperRules('https://electric-scooter.guide/reviews/test');
		expect(rules!.selectors.topSpeed).toBeDefined();
		expect(rules!.selectors.range).toBeDefined();
	});

	it('Electric Scooter Guide topSpeed selector has a regex', () => {
		const rules = getScraperRules('https://electric-scooter.guide/reviews/test');
		expect(rules!.selectors.topSpeed?.regex).toBeTruthy();
	});

	it('Electric Scooter Guide has batteryWh and weight selectors', () => {
		const rules = getScraperRules('https://electric-scooter.guide/reviews/test');
		expect(rules!.selectors.batteryWh).toBeDefined();
		expect(rules!.selectors.weight).toBeDefined();
	});

	it('Shopify Retailers price transform parses a dollar amount string', () => {
		const rules = getScraperRules('https://www.voromotors.com/');
		const transform = rules!.selectors.price!.transform!;
		expect(transform('$1,299.00')).toBe(1299);
	});

	it('Shopify Retailers price transform returns NaN for non-numeric input', () => {
		const rules = getScraperRules('https://www.voromotors.com/');
		const transform = rules!.selectors.price!.transform!;
		expect(transform('No price available')).toBeNaN();
	});

	it('urlPatterns is a non-empty array', () => {
		const rules = getScraperRules('https://www.gotrax.com/');
		expect(Array.isArray(rules!.urlPatterns)).toBe(true);
		expect(rules!.urlPatterns.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// getAllRulesets
// ---------------------------------------------------------------------------

describe('getAllRulesets', () => {
	it('returns an array with at least one ruleset', () => {
		const all = getAllRulesets();
		expect(Array.isArray(all)).toBe(true);
		expect(all.length).toBeGreaterThan(0);
	});

	it('every entry has manufacturer and urlPatterns', () => {
		const all = getAllRulesets();
		for (const ruleset of all) {
			expect(typeof ruleset.manufacturer).toBe('string');
			expect(Array.isArray(ruleset.urlPatterns)).toBe(true);
		}
	});

	it('does not expose selectors (only summary fields)', () => {
		const all = getAllRulesets();
		for (const ruleset of all) {
			expect((ruleset as any).selectors).toBeUndefined();
		}
	});

	it('includes Segway-Ninebot in the list', () => {
		const all = getAllRulesets();
		const manufacturers = all.map((r) => r.manufacturer);
		expect(manufacturers).toContain('Segway-Ninebot');
	});

	it('includes Electric Scooter Guide in the list', () => {
		const all = getAllRulesets();
		const manufacturers = all.map((r) => r.manufacturer);
		expect(manufacturers).toContain('Electric Scooter Guide');
	});
});
