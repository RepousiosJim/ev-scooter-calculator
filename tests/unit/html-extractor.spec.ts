/**
 * Unit tests for html-extractor.ts
 * Tests the pure HTML-parsing functions — no network I/O.
 */
import { describe, it, expect } from 'vitest';
import { extractProductsFromHTML } from '$lib/server/verification/html-extractor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonLdHtml(ldData: object): string {
	return `<html><head><script type="application/ld+json">${JSON.stringify(ldData)}</script></head><body></body></html>`;
}

// ---------------------------------------------------------------------------
// Empty / malformed HTML
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – empty / no products', () => {
	it('returns empty products array for empty HTML string', () => {
		const result = extractProductsFromHTML('', 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('returns empty products array for plain text with no markup', () => {
		const result = extractProductsFromHTML('just some text', 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('returns empty products array for HTML with no product data', () => {
		const html = '<html><head><title>Home</title></head><body><p>Welcome</p></body></html>';
		const result = extractProductsFromHTML(html, 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('still returns a result object (no throw) for malformed HTML', () => {
		const html = '<<<<>>>>>not valid html at all</><>';
		expect(() => extractProductsFromHTML(html, 'https://example.com/')).not.toThrow();
	});

	it('captures page title when present', () => {
		const html = '<html><head><title>My Store</title></head><body></body></html>';
		const result = extractProductsFromHTML(html, 'https://example.com/');
		expect(result.pageTitle).toBe('My Store');
	});

	it('pageTitle is undefined when no title tag', () => {
		const result = extractProductsFromHTML('<html><body></body></html>', 'https://example.com/');
		expect(result.pageTitle).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – platform detection', () => {
	it('detects shopify when cdn.shopify.com is in HTML', () => {
		const html = '<html><body><!-- cdn.shopify.com --></body></html>';
		const result = extractProductsFromHTML(html, 'https://mystore.com/');
		expect(result.platform).toBe('shopify');
	});

	it('detects woocommerce when woocommerce class is present', () => {
		const html = '<html><body><div class="woocommerce"></div></body></html>';
		const result = extractProductsFromHTML(html, 'https://mystore.com/');
		expect(result.platform).toBe('woocommerce');
	});

	it('returns custom for unrecognised HTML', () => {
		const html = '<html><body><p>Hello</p></body></html>';
		const result = extractProductsFromHTML(html, 'https://example.com/');
		expect(result.platform).toBe('custom');
	});
});

// ---------------------------------------------------------------------------
// Strategy 1: JSON-LD
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – JSON-LD strategy', () => {
	it('extracts a single Product type', () => {
		const ld = { '@type': 'Product', name: 'Ninebot Max G2', url: 'https://example.com/max-g2' };
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(1);
		expect(result.products[0].name).toBe('Ninebot Max G2');
		expect(result.products[0].method).toBe('json-ld');
		expect(result.methods).toContain('json-ld');
	});

	it('extracts price from offers object', () => {
		const ld = {
			'@type': 'Product',
			name: 'Xiaomi Pro 2',
			offers: { price: '499.00', priceCurrency: 'USD' },
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products[0].price).toBe(499);
	});

	it('extracts products from ItemList JSON-LD', () => {
		const ld = {
			'@type': 'ItemList',
			itemListElement: [
				{ item: { name: 'Apollo City Pro', url: 'https://example.com/city-pro' } },
				{ item: { name: 'Apollo Ghost', url: 'https://example.com/ghost' } },
			],
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(2);
		const names = result.products.map((p) => p.name);
		expect(names).toContain('Apollo City Pro');
		expect(names).toContain('Apollo Ghost');
	});

	it('extracts products from @graph wrapper', () => {
		const ld = {
			'@graph': [{ '@type': 'Product', name: 'Varla Eagle One', url: 'https://varla.com/eagle-one' }],
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://varla.com/');
		expect(result.products).toHaveLength(1);
		expect(result.products[0].name).toBe('Varla Eagle One');
	});

	it('extracts from CollectionPage mainEntity', () => {
		const ld = {
			'@type': 'CollectionPage',
			mainEntity: {
				itemListElement: [{ item: { name: 'Kaabo Wolf King GT', url: 'https://example.com/wolf-king-gt' } }],
			},
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(1);
		expect(result.products[0].name).toBe('Kaabo Wolf King GT');
	});

	it('handles invalid JSON-LD gracefully', () => {
		const html = '<html><head><script type="application/ld+json">{ bad json }</script></head><body></body></html>';
		expect(() => extractProductsFromHTML(html, 'https://example.com/')).not.toThrow();
	});

	it('skips JSON-LD item without a name', () => {
		const ld = { '@type': 'Product', url: 'https://example.com/product' }; // no name
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('deduplicates products with same name', () => {
		const html = `<html><head>
			<script type="application/ld+json">${JSON.stringify({ '@type': 'Product', name: 'Ninebot Max', url: 'https://example.com/1' })}</script>
			<script type="application/ld+json">${JSON.stringify({ '@type': 'Product', name: 'Ninebot Max', url: 'https://example.com/2' })}</script>
		</head><body></body></html>`;
		const result = extractProductsFromHTML(html, 'https://example.com/');
		expect(result.products).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Strategy 2: Shopify patterns
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – Shopify strategy', () => {
	it('extracts products from Shopify /products/ links', () => {
		const html = `
		<html>
		<head><title>Shop</title></head>
		<body><!-- cdn.shopify.com -->
			<main>
				<a href="/products/ninebot-max-g2">Ninebot Max G2</a>
				<a href="/products/xiaomi-pro-2">Xiaomi Pro 2</a>
			</main>
		</body>
		</html>`;
		const result = extractProductsFromHTML(html, 'https://mystore.com/collections/scooters');
		expect(result.products.length).toBeGreaterThan(0);
		const names = result.products.map((p) => p.name);
		expect(names.some((n) => n.includes('Ninebot') || n.includes('Xiaomi'))).toBe(true);
	});

	it('skips short link text (nav items)', () => {
		const html = `<html><body><!-- cdn.shopify.com -->
			<nav><a href="/products/ab">Go</a></nav>
			<main><a href="/products/ninebot-max">Ninebot Max G2 Electric Scooter</a></main>
		</body></html>`;
		const result = extractProductsFromHTML(html, 'https://mystore.com/');
		// Should not contain the "Go" nav link; may or may not have the main one depending on nav exclusion
		const names = result.products.map((p) => p.name);
		expect(names).not.toContain('Go');
	});
});

// ---------------------------------------------------------------------------
// Strategy 3: WooCommerce patterns
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – WooCommerce strategy', () => {
	it('extracts products from WooCommerce li.product elements', () => {
		const html = `
		<html><body>
			<ul class="products">
				<li class="product type-product">
					<a class="woocommerce-LoopProduct-link" href="/product/apollo-city-pro/">
						<h2 class="woocommerce-loop-product__title">Apollo City Pro</h2>
					</a>
					<span class="price"><span class="woocommerce-Price-amount">999</span></span>
				</li>
			</ul>
		</body></html>`;
		const result = extractProductsFromHTML(html, 'https://apolloscooters.co/');
		expect(result.products.length).toBeGreaterThan(0);
		expect(result.products[0].name).toBe('Apollo City Pro');
		expect(result.products[0].price).toBe(999);
	});
});

// ---------------------------------------------------------------------------
// Strategy 4: Generic links
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – generic-links strategy', () => {
	it('extracts products via /product/ link pattern', () => {
		const html = `
		<html><body>
			<div class="products">
				<a href="/product/varla-eagle-one">Varla Eagle One Pro Scooter</a>
			</div>
		</body></html>`;
		const result = extractProductsFromHTML(html, 'https://varla.com/');
		expect(result.products.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Strategy 5: Meta tags
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – meta-tags strategy', () => {
	it('extracts product from og:title when og:type is product', () => {
		const html = `
		<html><head>
			<meta property="og:title" content="Kaabo Wolf King GT Pro" />
			<meta property="og:type" content="product" />
			<meta property="og:url" content="https://kaabo.com/wolf-king-gt-pro" />
		</head><body></body></html>`;
		const result = extractProductsFromHTML(html, 'https://kaabo.com/');
		expect(result.products).toHaveLength(1);
		expect(result.products[0].name).toBe('Kaabo Wolf King GT Pro');
		expect(result.products[0].method).toBe('meta-tags');
	});

	it('does not extract when og:type is not product', () => {
		const html = `
		<html><head>
			<meta property="og:title" content="Some Article" />
			<meta property="og:type" content="article" />
		</head><body></body></html>`;
		const result = extractProductsFromHTML(html, 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// isLikelyScooter filter
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – scooter filter', () => {
	it('filters out accessories like helmets', () => {
		const ld = { '@type': 'Product', name: 'Pro Helmet Full Face', url: 'https://example.com/helmet' };
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('filters out brake pads', () => {
		const ld = { '@type': 'Product', name: 'Brake Pad Set', url: 'https://example.com/brakepad' };
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('filters out items starting with view/shop/buy navigation text', () => {
		const ld = { '@type': 'Product', name: 'View All Scooters', url: 'https://example.com/all' };
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});

	it('keeps legitimate scooter products', () => {
		const ld = { '@type': 'Product', name: 'Ninebot Max G2', url: 'https://example.com/max-g2' };
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(1);
	});

	it('filters out (2 Pack) style bundle names', () => {
		const ld = {
			'@type': 'Product',
			name: '(2 Pack) Replacement Tire',
			url: 'https://example.com/tires',
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// cleanProductName (via extraction output)
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – cleanProductName side-effects', () => {
	it('strips "| Brand Name" suffixes from product names', () => {
		const ld = {
			'@type': 'Product',
			name: 'Ninebot Max G2 | Segway Store',
			url: 'https://example.com/max-g2',
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products[0].name).toBe('Ninebot Max G2');
	});

	it('strips "- Buy Now" style suffixes', () => {
		const ld = {
			'@type': 'Product',
			name: 'Apollo City Pro - Buy Online',
			url: 'https://example.com/city-pro',
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products[0].name).toBe('Apollo City Pro');
	});

	it('collapses internal whitespace', () => {
		const ld = {
			'@type': 'Product',
			name: 'Varla   Eagle    One',
			url: 'https://example.com/eagle',
		};
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.products[0].name).toBe('Varla Eagle One');
	});
});

// ---------------------------------------------------------------------------
// methods array tracking
// ---------------------------------------------------------------------------

describe('extractProductsFromHTML – methods tracking', () => {
	it('records methods used for extraction', () => {
		const ld = { '@type': 'Product', name: 'Ninebot Max G2', url: 'https://example.com/max' };
		const result = extractProductsFromHTML(makeJsonLdHtml(ld), 'https://example.com/');
		expect(result.methods).toContain('json-ld');
	});

	it('starts with empty methods for no-match HTML', () => {
		const result = extractProductsFromHTML('<html><body><p>nothing</p></body></html>', 'https://example.com/');
		expect(result.methods).toHaveLength(0);
	});
});
