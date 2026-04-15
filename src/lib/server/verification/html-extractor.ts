/**
 * Smart HTML-based scooter extraction — NO external API needed.
 *
 * Extraction chain (tried in order):
 * 1. JSON-LD structured data (most reliable — Shopify, WooCommerce)
 * 2. Shopify product grid CSS patterns
 * 3. Generic product link/card patterns
 *
 * Gemini LLM is called separately only as an optional enhancement.
 */
import { parse, type HTMLElement } from 'node-html-parser';

export interface ExtractedProduct {
	name: string;
	url: string;
	price?: number;
	imageUrl?: string;
	/** Extraction method that found this product */
	method: 'json-ld' | 'shopify' | 'woocommerce' | 'generic-links' | 'meta-tags';
}

export interface ExtractionResult {
	products: ExtractedProduct[];
	methods: string[];
	errors: string[];
	pageTitle?: string;
	platform?: 'shopify' | 'woocommerce' | 'custom';
}

/**
 * Extract scooter products from raw HTML using multiple strategies.
 * No external API calls — pure HTML parsing.
 */
export function extractProductsFromHTML(html: string, sourceUrl: string): ExtractionResult {
	const result: ExtractionResult = {
		products: [],
		methods: [],
		errors: [],
	};

	let root: HTMLElement;
	try {
		root = parse(html);
	} catch (_e) {
		result.errors.push('Failed to parse HTML');
		return result;
	}

	// Detect page title
	result.pageTitle = root.querySelector('title')?.textContent?.trim();

	// Detect platform
	result.platform = detectPlatform(html, root);

	// Strategy 1: JSON-LD structured data (most reliable)
	const jsonLdProducts = extractFromJsonLd(root, sourceUrl);
	if (jsonLdProducts.length > 0) {
		result.products.push(...jsonLdProducts);
		result.methods.push('json-ld');
	}

	// Strategy 2: Shopify-specific patterns
	if (result.platform === 'shopify' || result.products.length === 0) {
		const shopifyProducts = extractFromShopify(root, sourceUrl);
		if (shopifyProducts.length > 0) {
			result.products.push(...shopifyProducts);
			result.methods.push('shopify');
		}
	}

	// Strategy 3: WooCommerce patterns
	if (result.platform === 'woocommerce' || result.products.length === 0) {
		const wooProducts = extractFromWooCommerce(root, sourceUrl);
		if (wooProducts.length > 0) {
			result.products.push(...wooProducts);
			result.methods.push('woocommerce');
		}
	}

	// Strategy 4: Generic product link patterns
	if (result.products.length === 0) {
		const genericProducts = extractFromGenericLinks(root, sourceUrl);
		if (genericProducts.length > 0) {
			result.products.push(...genericProducts);
			result.methods.push('generic-links');
		}
	}

	// Strategy 5: Open Graph / meta tags as last resort
	if (result.products.length === 0) {
		const metaProducts = extractFromMetaTags(root, sourceUrl);
		if (metaProducts.length > 0) {
			result.products.push(...metaProducts);
			result.methods.push('meta-tags');
		}
	}

	// Deduplicate by name (case-insensitive)
	const seen = new Set<string>();
	result.products = result.products.filter((p) => {
		const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
		if (!key || key.length < 3) return false;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	// Filter out non-scooter products
	result.products = result.products.filter(isLikelyScooter);

	return result;
}

/** Detect the e-commerce platform from HTML */
function detectPlatform(html: string, root: HTMLElement): 'shopify' | 'woocommerce' | 'custom' {
	// Shopify markers
	if (
		html.includes('cdn.shopify.com') ||
		html.includes('Shopify.theme') ||
		html.includes('/collections/') ||
		root.querySelector('meta[name="shopify-checkout-api-token"]')
	) {
		return 'shopify';
	}

	// WooCommerce markers
	if (
		html.includes('woocommerce') ||
		html.includes('wc-block') ||
		root.querySelector('.woocommerce') ||
		root.querySelector('.products .product')
	) {
		return 'woocommerce';
	}

	return 'custom';
}

/** Strategy 1: Extract from JSON-LD structured data */
function extractFromJsonLd(root: HTMLElement, sourceUrl: string): ExtractedProduct[] {
	const products: ExtractedProduct[] = [];
	const scripts = root.querySelectorAll('script[type="application/ld+json"]');

	for (const script of scripts) {
		try {
			let data = JSON.parse(script.textContent);

			// Handle @graph wrapper
			if (data['@graph']) data = data['@graph'];

			// Handle arrays
			const items = Array.isArray(data) ? data : [data];

			for (const item of items) {
				// Direct Product type
				if (item['@type'] === 'Product' && item.name) {
					products.push({
						name: cleanProductName(item.name),
						url: item.url || item.offers?.url || sourceUrl,
						price: extractPrice(item.offers),
						imageUrl: typeof item.image === 'string' ? item.image : item.image?.url,
						method: 'json-ld',
					});
				}

				// ItemList type (common on collection pages)
				if (item['@type'] === 'ItemList' && item.itemListElement) {
					for (const listItem of item.itemListElement) {
						const product = listItem.item || listItem;
						if (product.name) {
							products.push({
								name: cleanProductName(product.name),
								url: product.url || sourceUrl,
								price: extractPrice(product.offers),
								imageUrl: typeof product.image === 'string' ? product.image : product.image?.url,
								method: 'json-ld',
							});
						}
					}
				}

				// CollectionPage with products
				if (item['@type'] === 'CollectionPage' && item.mainEntity?.itemListElement) {
					for (const listItem of item.mainEntity.itemListElement) {
						const product = listItem.item || listItem;
						if (product.name) {
							products.push({
								name: cleanProductName(product.name),
								url: product.url || sourceUrl,
								price: extractPrice(product.offers),
								method: 'json-ld',
							});
						}
					}
				}
			}
		} catch {
			// Invalid JSON-LD, skip
		}
	}

	return products;
}

/** Strategy 2: Extract from Shopify product grid patterns */
function extractFromShopify(root: HTMLElement, sourceUrl: string): ExtractedProduct[] {
	const products: ExtractedProduct[] = [];
	const baseUrl = new URL(sourceUrl).origin;

	// Shopify product cards — multiple selector patterns
	const cardSelectors = [
		'.product-card',
		'.product-item',
		'.grid-product',
		'.product-grid-item',
		'.collection-product',
		'[data-product-card]',
		'.product-card-wrapper',
		'.grid__item .card',
		'.productgrid--item',
	];

	for (const sel of cardSelectors) {
		const cards = root.querySelectorAll(sel);
		for (const card of cards) {
			const name = extractCardName(card);
			const url = extractCardUrl(card, baseUrl);
			const price = extractCardPrice(card);
			if (name) {
				products.push({ name: cleanProductName(name), url: url || sourceUrl, price, method: 'shopify' });
			}
		}
		if (products.length > 0) break; // Stop at first successful selector
	}

	// Fallback: Shopify product links in collection grids
	if (products.length === 0) {
		const productLinks = root.querySelectorAll('a[href*="/products/"]');
		const seen = new Set<string>();
		for (const link of productLinks) {
			const href = link.getAttribute('href') || '';
			const fullUrl = href.startsWith('http') ? href : baseUrl + href;
			const name = link.textContent?.trim();

			// Skip nav/footer links, require meaningful text
			if (!name || name.length < 3 || name.length > 100) continue;
			if (link.closest('nav, footer, .nav, .footer, .header, [role="navigation"]')) continue;

			const urlKey = new URL(fullUrl).pathname;
			if (seen.has(urlKey)) continue;
			seen.add(urlKey);

			products.push({ name: cleanProductName(name), url: fullUrl, method: 'shopify' });
		}
	}

	return products;
}

/** Strategy 3: Extract from WooCommerce patterns */
function extractFromWooCommerce(root: HTMLElement, sourceUrl: string): ExtractedProduct[] {
	const products: ExtractedProduct[] = [];
	const baseUrl = new URL(sourceUrl).origin;

	const wooProducts = root.querySelectorAll('.product, .type-product, li.product');
	for (const product of wooProducts) {
		const titleEl = product.querySelector('.woocommerce-loop-product__title, .product-title, h2, h3');
		const linkEl = product.querySelector('a[href*="/product/"], a.woocommerce-LoopProduct-link');
		const priceEl = product.querySelector('.price .amount, .woocommerce-Price-amount');

		const name = titleEl?.textContent?.trim();
		let url = linkEl?.getAttribute('href') || '';
		if (url && !url.startsWith('http')) url = baseUrl + url;

		const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '');
		const price = priceText ? parseFloat(priceText) : undefined;

		if (name) {
			products.push({ name: cleanProductName(name), url: url || sourceUrl, price, method: 'woocommerce' });
		}
	}

	return products;
}

/** Strategy 4: Generic product link extraction */
function extractFromGenericLinks(root: HTMLElement, sourceUrl: string): ExtractedProduct[] {
	const products: ExtractedProduct[] = [];
	const baseUrl = new URL(sourceUrl).origin;

	// Look for links with product-like URL patterns
	const productPatterns = [
		'a[href*="/product/"]',
		'a[href*="/products/"]',
		'a[href*="/scooter"]',
		'a[href*="/electric-scooter"]',
		'a[href*="/e-scooter"]',
	];

	const seen = new Set<string>();
	for (const pattern of productPatterns) {
		const links = root.querySelectorAll(pattern);
		for (const link of links) {
			// Skip nav, footer, breadcrumb links
			if (link.closest('nav, footer, header, .breadcrumb, [role="navigation"]')) continue;

			const href = link.getAttribute('href') || '';
			const fullUrl = href.startsWith('http') ? href : baseUrl + href;
			const name = link.textContent?.trim();

			if (!name || name.length < 4 || name.length > 100) continue;

			const urlKey = new URL(fullUrl).pathname;
			if (seen.has(urlKey)) continue;
			seen.add(urlKey);

			products.push({ name: cleanProductName(name), url: fullUrl, method: 'generic-links' });
		}
	}

	return products;
}

/** Strategy 5: Extract from meta tags / Open Graph */
function extractFromMetaTags(root: HTMLElement, sourceUrl: string): ExtractedProduct[] {
	const products: ExtractedProduct[] = [];

	// og:title often has the product name on product pages
	const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute('content');
	const ogType = root.querySelector('meta[property="og:type"]')?.getAttribute('content');
	const ogUrl = root.querySelector('meta[property="og:url"]')?.getAttribute('content');

	if (ogTitle && ogType === 'product') {
		products.push({
			name: cleanProductName(ogTitle),
			url: ogUrl || sourceUrl,
			method: 'meta-tags',
		});
	}

	return products;
}

// --- Helpers ---

function extractCardName(card: HTMLElement): string | null {
	const nameSelectors = [
		'.product-card__title',
		'.product-card__name',
		'.product-item__title',
		'.grid-product__title',
		'.product-title',
		'.card__heading',
		'h2',
		'h3',
		'[data-product-title]',
		'.title',
	];
	for (const sel of nameSelectors) {
		const el = card.querySelector(sel);
		if (el?.textContent?.trim()) return el.textContent.trim();
	}
	return null;
}

function extractCardUrl(card: HTMLElement, baseUrl: string): string | null {
	const link = card.querySelector('a[href]');
	if (!link) return null;
	const href = link.getAttribute('href') || '';
	return href.startsWith('http') ? href : baseUrl + href;
}

function extractCardPrice(card: HTMLElement): number | undefined {
	const priceSelectors = [
		'.product-card__price',
		'.price',
		'.product-price',
		'.money',
		'[data-product-price]',
		'.grid-product__price',
	];
	for (const sel of priceSelectors) {
		const el = card.querySelector(sel);
		if (el) {
			const text = el.textContent?.replace(/[^0-9.]/g, '');
			if (text) {
				const val = parseFloat(text);
				if (val > 50 && val < 20000) return val;
			}
		}
	}
	return undefined;
}

function extractPrice(offers: unknown): number | undefined {
	if (!offers) return undefined;
	// Can be single offer or array
	const offer = Array.isArray(offers) ? (offers[0] as Record<string, unknown>) : (offers as Record<string, unknown>);
	const price = offer?.price || offer?.lowPrice;
	if (price) {
		const val = typeof price === 'string' ? parseFloat(price) : (price as number);
		if (typeof val === 'number' && val > 50 && val < 20000) return val;
	}
	return undefined;
}

function cleanProductName(name: string): string {
	return (
		name
			.replace(/\s+/g, ' ')
			.replace(/[\n\r\t]/g, ' ')
			.trim()
			// Remove common suffixes
			.replace(/\s*[-–]\s*(Buy|Shop|Order|Sale|New|Free Shipping).*$/i, '')
			.replace(/\s*\|\s*.*$/, '') // Remove "| Brand Name" suffixes
			.trim()
	);
}

/** Known electric scooter manufacturer names for positive signal matching */
const KNOWN_SCOOTER_BRANDS = new Set([
	'xiaomi',
	'segway',
	'ninebot',
	'kaabo',
	'dualtron',
	'minimotors',
	'nami',
	'vsett',
	'emove',
	'apollo',
	'gotrax',
	'hiboy',
	'niu',
	'navee',
	'isinwheel',
	'nanrobot',
	'varla',
	'teverun',
	'inmotion',
	'inokim',
	'fluid',
	'hover-1',
	'hover1',
	'zero',
	'mercane',
	'levy',
	'mukuta',
	'evercross',
	'joyor',
	'speedway',
	'weped',
	'blade',
	'pure electric',
	'hooga',
	'sxt',
	'yadea',
	'razor',
	'turboant',
	'urbanglide',
	'kugoo',
	'aovo',
	'aovopro',
	'mantis',
	'wolf',
	'thunder',
	'eagle',
	'falcon',
	'cruiser',
	'roadster',
	'phantom',
	'titan',
	'storm',
	'spider',
	'viper',
]);

// Exclude terms checked on every product — defined at module scope to avoid
// re-allocating an 80-element array on every isLikelyScooter call.
const EXCLUDE_TERMS = [
	// Accessories — standalone items
	'helmet',
	'glove',
	'lock',
	'bag',
	'backpack',
	'charger only',
	'charging cable',
	'tire',
	'tyre',
	'inner tube',
	'outer tube',
	'brake pad',
	'brake rotor',
	'brake disc',
	'brake caliper',
	'fender',
	'horn',
	'bell',
	'phone mount',
	'phone holder',
	'mirror',
	'basket',
	'grip',
	'handlebar grip',
	'sticker',
	'decal',
	'cover',
	'carrying case',
	'rack',
	'gift card',
	'warranty',
	'insurance',
	'subscription',
	'protection plan',
	'service plan',
	'extended warranty',
	'steering damper',
	'mudguard',
	'seat cover',
	'seat attachment',
	'sim card',
	'data plan',
	'recharge plan',
	'data recharge',
	'light set',
	'light kit',
	// Parts & hardware
	'spare part',
	'replacement',
	'accessory',
	'accessories',
	'bundle deal',
	'bolt',
	'screw',
	'nut',
	'washer',
	'spacer',
	'bushing',
	'bearing',
	'valve',
	'hook',
	'clamp',
	'bracket',
	'plate',
	'rotor',
	'caliper',
	'lever',
	'cable',
	'wire',
	'connector',
	'controller board',
	'throttle',
	'dashboard',
	'kickstand',
	'footrest',
	'deck plate',
	'stem',
	'battery pack',
	'battery replacement',
	'battery upgrade',
	// Other vehicles (non-scooter)
	'bicycle',
	'motorcycle',
	'moped',
	'motorbike',
	'go-kart',
	'gokart',
	'go kart',
	'hoverboard',
	'unicycle',
	'euc',
	'skateboard',
	'onewheel',
	'segway ninebot s',
	'balance scooter',
	'dirt bike',
	'pit bike',
	'atv',
	'quad',
	// Kids / toys (additional patterns)
	'for toddler',
	'for kids under',
	'toy scooter',
	'toy car',
	'ride-on toy',
	'ride on toy',
	// Clothing & apparel
	't-shirt',
	'tshirt',
	'hoodie',
	'hat',
	'cap',
	'jersey',
	'jacket',
	'pants',
	'shorts',
	'socks',
	'shoe',
	'boot',
	'knee pad',
	'elbow pad',
];

/** Filter out products that are clearly not electric scooters */
function isLikelyScooter(product: ExtractedProduct): boolean {
	const name = product.name.toLowerCase();
	const nameTrimmed = name.trim();

	// --- Hard exclusions: definitely NOT a scooter ---

	// Too short or too long to be a real product name
	if (nameTrimmed.length < 3 || nameTrimmed.length > 100) return false;

	// Generic / navigation page text (exact match or near-exact for short junk strings)
	const genericNames = [
		'purchase',
		'sold out',
		'lookbook',
		'contact',
		'about',
		'blog',
		'news',
		'support',
		'faq',
		'cart',
		'checkout',
		'account',
		'login',
		'register',
		'sign up',
		'lineup',
		'collection',
		'catalog',
		'catalogue',
		'menu',
	];
	if (genericNames.includes(nameTrimmed)) return false;

	// Navigation / marketing text (starts with)
	if (/^(view|shop|buy|see|browse|all|home|about|contact|learn|read|sign|log|create|subscribe)/i.test(nameTrimmed))
		return false;

	// Reject if price is embedded in the name (e.g., "ZERO 9 €862,95" or "$599")
	if (/[€$£]\s*\d+/i.test(name) || /\d+[.,]\d{2}\s*[€$£]/i.test(name)) return false;

	// Reject used / refurbished items: "97% New", "refurbished", "pre-owned", "open box"
	if (/\d+%\s*new\b/i.test(name)) return false;
	if (/\b(refurbished|pre-owned|pre owned|open box|used|certified used)\b/i.test(name)) return false;

	// Reject kids items
	if (/\bkids\b/i.test(name)) return false;
	if (/\btoy\b/i.test(name)) return false;
	if (/\bfor children\b/i.test(name)) return false;
	if (/\baged\s+\d/i.test(name)) return false;

	// Reject electric bikes (unless it also says "scooter")
	if (!name.includes('scooter')) {
		if (/\b(electric bike|e-bike|ebike)\b/i.test(name)) return false;
	}

	// Reject 3-wheel / tricycle items
	if (/\b3\s*wheel/i.test(name) || /\bthree\s*wheel/i.test(name) || /\btricycle\b/i.test(name)) return false;

	// Exclude accessories, parts, other vehicles
	if (EXCLUDE_TERMS.some((term) => name.includes(term))) return false;

	// Reject standalone "charger" (but not model names like "Super Charger" that are scooters)
	// Match: "KQi Super Charger", "KQi 100 Charger", "Charger 42V 2A"
	// A charger is standalone if "charger" is the last word or followed by specs (voltage/amps)
	if (/\bcharger\b/i.test(name) && !/\bscooter\b/i.test(name)) return false;

	// Reject standalone "battery" (but keep model names containing "battery" if also scooter)
	if (/\bbattery\b/i.test(name) && !/\bscooter\b/i.test(name)) return false;

	// Reject names starting with accessory-like prefixes (e.g., "Steering Damper - RoadRunner RS5")
	if (/^(steering damper|fender|mudguard|seat|light|mirror|bell|mount|stand|basket|rack)\b/i.test(nameTrimmed))
		return false;

	// Reject "Product Name :" prefix as raw data artifact
	if (/^product name\s*:/i.test(nameTrimmed)) return false;

	// Exclude items with quantity patterns like "(2 Pack)", "Set of 4", "2x"
	if (/^\(\d+\s*(pack|set|pair|pc|pcs)\)/i.test(name)) return false;
	if (/\bset of \d+\b/i.test(name)) return false;
	if (/^\d+x\s/i.test(name)) return false;

	// Exclude manual/non-electric kick scooters
	if (/\b(manual|non-electric|non electric|push|kick)\s+scooter\b/i.test(name)) return false;
	// "kick scooter" without "electric" is usually non-electric
	if (name.includes('kick scooter') && !name.includes('electric')) return false;

	// Exclude if it's clearly just a spec mention, not a product name
	// e.g., "48V 20Ah Lithium Battery" or "1000W Brushless Motor"
	if (/^\d+\s*(v|ah|wh|w|a)\b/i.test(nameTrimmed) && !name.includes('scooter')) return false;

	// --- Price reasonableness check ---
	if (product.price !== undefined) {
		// Electric scooters generally $100-$15,000; $0 or $1 items are freebies/errors
		if (product.price < 80 || product.price > 15000) return false;
	}

	// --- Positive signal check (at least one must match) ---
	// Known brand name, model pattern, or "scooter" keyword
	const hasScooterKeyword = /\b(scooter|e-scooter|escooter)\b/i.test(name);
	let hasKnownBrand = false;
	for (const brand of KNOWN_SCOOTER_BRANDS) {
		if (name.includes(brand)) {
			hasKnownBrand = true;
			break;
		}
	}
	const hasModelPattern = /\b[a-z]{1,3}\d{1,4}\b/i.test(name); // e.g., S2, G3, KQi3, M365
	const hasProductUrl = product.url && /\/(products?|scooter|e-scooter)\//i.test(product.url);
	const hasVoltageInName = /\b(36|48|52|60|72)v\b/i.test(name);
	const hasWattageInName = /\b\d{3,5}\s*w\b/i.test(name);

	// Must have at least one positive signal
	if (
		!hasScooterKeyword &&
		!hasKnownBrand &&
		!hasModelPattern &&
		!hasProductUrl &&
		!hasVoltageInName &&
		!hasWattageInName
	) {
		return false;
	}

	return true;
}

/**
 * Fetch a URL with proper headers and timeout.
 * Returns { ok, status, html, error }
 */
export async function fetchPage(
	url: string,
	timeoutMs = 8000
): Promise<{
	ok: boolean;
	status: number;
	html: string;
	error?: string;
}> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml',
				'Accept-Language': 'en-US,en;q=0.9',
			},
			signal: AbortSignal.timeout(timeoutMs),
			redirect: 'follow',
		});

		if (!response.ok) {
			return { ok: false, status: response.status, html: '', error: `HTTP ${response.status}` };
		}

		const html = await response.text();
		return { ok: true, status: response.status, html };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return { ok: false, status: 0, html: '', error: msg };
	}
}
