import type { SpecField } from './types';

export interface ScrapeSelector {
	cssSelector: string;
	regex?: string;
	transform?: (raw: string) => number;
}

export interface ScrapeRuleset {
	manufacturer: string;
	urlPatterns: string[]; // Hostname patterns to match
	selectors: Partial<Record<SpecField, ScrapeSelector>>;
}

/**
 * Per-site scraping rules. These use CSS selectors to extract specs.
 * The generic regex fallback in scraper.ts handles most cases,
 * so these rules are for sites with known, stable HTML structures.
 *
 * Updated: 2026-04 — removed rules for dead/JS-rendered sites.
 */
const rules: ScrapeRuleset[] = [
	{
		// Shopify-based stores (Voro Motors, RevRides, FluidFreeRide, etc.)
		// Most scooter retailers use Shopify — price comes from meta tags
		manufacturer: 'Shopify Retailers',
		urlPatterns: ['voromotors.com', 'revrides.com', 'fluidfreeride.com', 'rfriders.com'],
		selectors: {
			price: {
				cssSelector: 'meta[property="product:price:amount"], meta[property="og:price:amount"], .product-price, .price',
				transform: (raw: string) => {
					// Meta tag content attribute or text
					const match = raw.match(/[\d,]+(?:\.\d{2})?/);
					return match ? parseFloat(match[0].replace(/,/g, '')) : NaN;
				}
			}
		}
	},
	{
		manufacturer: 'Segway-Ninebot',
		urlPatterns: ['store.segway.com', 'segway.com'],
		selectors: {
			price: {
				cssSelector: 'meta[property="product:price:amount"], .product-price, [data-price]',
				transform: (raw: string) => {
					const match = raw.match(/[\d,]+(?:\.\d{2})?/);
					return match ? parseFloat(match[0].replace(/,/g, '')) : NaN;
				}
			}
		}
	},
	{
		manufacturer: 'Electric Scooter Guide',
		urlPatterns: ['electric-scooter.guide'],
		selectors: {
			topSpeed: {
				cssSelector: '.esg-spec-speed, .spec-table td, .review-specs td',
				regex: '(\\d+(?:\\.\\d+)?)\\s*(?:km/h|mph)'
			},
			range: {
				cssSelector: '.esg-spec-range, .spec-table td, .review-specs td',
				regex: '(\\d+(?:\\.\\d+)?)\\s*(?:km|mi)'
			},
			batteryWh: {
				cssSelector: '.esg-spec-battery, .spec-table td, .review-specs td',
				regex: '(\\d+(?:\\.\\d+)?)\\s*Wh'
			},
			price: {
				cssSelector: '.esg-spec-price, .spec-table td, .review-specs td',
				regex: '\\$?([\\d,]+(?:\\.\\d{2})?)'
			},
			weight: {
				cssSelector: '.esg-spec-weight, .spec-table td, .review-specs td',
				regex: '(\\d+(?:\\.\\d+)?)\\s*(?:kg|lbs?)'
			}
		}
	},
	{
		manufacturer: 'Gotrax',
		urlPatterns: ['gotrax.com'],
		selectors: {
			price: {
				cssSelector: 'meta[property="product:price:amount"], .product-price, .price',
				transform: (raw: string) => {
					const match = raw.match(/[\d,]+(?:\.\d{2})?/);
					return match ? parseFloat(match[0].replace(/,/g, '')) : NaN;
				}
			}
		}
	},
	{
		manufacturer: 'Hiboy',
		urlPatterns: ['hiboy.com'],
		selectors: {
			price: {
				cssSelector: 'meta[property="product:price:amount"], .product-price, .price',
				transform: (raw: string) => {
					const match = raw.match(/[\d,]+(?:\.\d{2})?/);
					return match ? parseFloat(match[0].replace(/,/g, '')) : NaN;
				}
			}
		}
	},
];

/**
 * Find matching scraper rules for a given URL.
 */
export function getScraperRules(url: string): ScrapeRuleset | null {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		return (
			rules.find((r) =>
				r.urlPatterns.some(
					(pattern) => hostname.includes(pattern.toLowerCase())
				)
			) || null
		);
	} catch {
		return null;
	}
}

/** Get all available rule sets (for display in admin) */
export function getAllRulesets(): { manufacturer: string; urlPatterns: string[] }[] {
	return rules.map((r) => ({
		manufacturer: r.manufacturer,
		urlPatterns: r.urlPatterns
	}));
}
