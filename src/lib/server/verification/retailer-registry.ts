/**
 * Registry of known electric scooter retailers with affiliate program configuration.
 */

export type AffiliateNetwork = 'amazon' | 'shareasale' | 'cj' | 'avantlink' | 'direct' | 'none';

export interface RetailerInfo {
	id: string;
	name: string;
	website: string;
	/** URL pattern for product pages, {slug} will be replaced */
	productUrlPattern?: string;
	affiliateNetwork: AffiliateNetwork;
	/** e.g., Amazon associate tag, ShareASale merchant ID */
	affiliateTag?: string;
	/** Whether this retailer is actively monitored */
	active: boolean;
	/** Country/region (ISO 3166-1 alpha-2) */
	region: string;
	/** Priority for display ordering (lower = higher priority) */
	priority: number;
}

const retailers: RetailerInfo[] = [
	{
		id: 'fluidfreeride',
		name: 'FluidFreeRide',
		website: 'https://fluidfreeride.com',
		productUrlPattern: '/products/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 1,
	},
	{
		id: 'voromotors',
		name: 'Voro Motors',
		website: 'https://voromotors.com',
		productUrlPattern: '/products/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 2,
	},
	{
		id: 'revrides',
		name: 'RevRides',
		website: 'https://revrides.com',
		productUrlPattern: '/products/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 3,
	},
	{
		id: 'alienrides',
		name: 'Alien Rides',
		website: 'https://alienrides.com',
		productUrlPattern: '/products/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 4,
	},
	{
		id: 'ewheels',
		name: 'EWHEELS',
		website: 'https://ewheels.com',
		productUrlPattern: '/product/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 5,
	},
	{
		id: 'minimotorsusa',
		name: 'MiniMotors USA',
		website: 'https://minimotorsusa.com',
		productUrlPattern: '/products/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 6,
	},
	{
		id: 'rideplus',
		name: 'Ride+',
		website: 'https://rfrideplus.com',
		productUrlPattern: '/products/{slug}',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 7,
	},
	{
		id: 'amazon',
		name: 'Amazon',
		website: 'https://amazon.com',
		productUrlPattern: '/s?k={slug}+electric+scooter',
		affiliateNetwork: 'amazon',
		active: true,
		region: 'US',
		priority: 10,
	},
	{
		id: 'electricscooterguide',
		name: 'Electric Scooter Guide',
		website: 'https://electricscooterguide.com',
		affiliateNetwork: 'none',
		active: true,
		region: 'US',
		priority: 20,
	},
];

// ---------------------------------------------------------------------------
// Lookup index
// ---------------------------------------------------------------------------

const retailerMap = new Map<string, RetailerInfo>(retailers.map((r) => [r.id, r]));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Look up a retailer by its unique id. */
export function getRetailer(id: string): RetailerInfo | undefined {
	return retailerMap.get(id);
}

/** Return all active retailers sorted by priority (ascending). */
export function getActiveRetailers(): RetailerInfo[] {
	return retailers.filter((r) => r.active).sort((a, b) => a.priority - b.priority);
}

/**
 * Convert a scooter display name into a URL-safe slug.
 * "Kaabo Wolf King GTR Pro" -> "kaabo-wolf-king-gtr-pro"
 */
function slugifyForRetailer(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Build a full product URL for a given retailer and scooter name.
 * Returns the retailer homepage if no productUrlPattern is configured.
 */
export function buildProductUrl(retailer: RetailerInfo, scooterName: string): string {
	if (!retailer.productUrlPattern) return retailer.website;
	const slug = slugifyForRetailer(scooterName);
	const path = retailer.productUrlPattern.replace('{slug}', slug);
	return `${retailer.website}${path}`;
}

/**
 * Append affiliate parameters to a raw URL based on the retailer's network type.
 * Returns the URL unchanged if no affiliate tag is configured or network is 'none'.
 */
export function buildAffiliateUrl(rawUrl: string, retailer: RetailerInfo): string {
	// Affiliate networks not yet configured — returning raw product URL.
	if (retailer.affiliateNetwork === 'none' || !retailer.affiliateTag) return rawUrl;

	const url = new URL(rawUrl);

	if (retailer.affiliateNetwork === 'amazon') {
		url.searchParams.set('tag', retailer.affiliateTag);
	} else if (retailer.affiliateNetwork === 'shareasale') {
		url.searchParams.set('sscid', retailer.affiliateTag);
	}

	return url.toString();
}
