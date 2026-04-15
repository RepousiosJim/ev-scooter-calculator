import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import {
	getPurchaseLinks,
	getAllPurchaseData,
	addPurchaseLink,
	removePurchaseLink,
	setPurchaseLinks,
	getPurchaseLinkStats,
	type PurchaseLink,
} from '$lib/server/verification/purchase-links';
import {
	getActiveRetailers,
	getRetailer,
	buildProductUrl,
	buildAffiliateUrl,
} from '$lib/server/verification/retailer-registry';
import { fetchPage } from '$lib/server/verification/html-extractor';
import { logActivity } from '$lib/server/verification/activity-log';

/**
 * GET: List purchase links.
 * Query params: ?scooterKey=specific_key  (omit for all + stats)
 */
export const GET: RequestHandler = async ({ url, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const scooterKey = url.searchParams.get('scooterKey');

	if (scooterKey) {
		const links = await getPurchaseLinks(scooterKey);
		return json({ scooterKey, links });
	}

	const [allData, stats, retailers] = await Promise.all([
		getAllPurchaseData(),
		getPurchaseLinkStats(),
		Promise.resolve(getActiveRetailers()),
	]);

	return json({ data: allData, stats, retailers });
};

/**
 * POST: Manage purchase links.
 * Body: { action: 'add' | 'remove' | 'set' | 'auto-discover' | 'refresh-prices', ... }
 */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json();
	const { action } = body as { action: string };

	switch (action) {
		/**
		 * Add a single purchase link.
		 * Body: { action: 'add', scooterKey, link: PurchaseLink }
		 */
		case 'add': {
			const { scooterKey, link } = body as { scooterKey: string; link: PurchaseLink };
			if (!scooterKey) throw error(400, 'scooterKey is required');
			if (!link?.retailerId || !link?.rawUrl) throw error(400, 'link with retailerId and rawUrl is required');

			// Auto-apply affiliate tagging if retailer is known
			const retailer = getRetailer(link.retailerId);
			if (retailer) {
				link.url = buildAffiliateUrl(link.rawUrl, retailer);
				link.affiliateNetwork = retailer.affiliateNetwork;
			} else {
				link.url = link.rawUrl;
				link.affiliateNetwork = link.affiliateNetwork || 'none';
			}

			link.lastChecked = link.lastChecked || new Date().toISOString();
			link.currency = link.currency || 'USD';

			await addPurchaseLink(scooterKey, link);

			await logActivity('source_added', `Added purchase link: ${link.retailerName} for ${scooterKey}`, {
				scooterKey,
				retailerId: link.retailerId,
				price: link.price,
			});

			return json({ success: true });
		}

		/**
		 * Remove a purchase link.
		 * Body: { action: 'remove', scooterKey, retailerId }
		 */
		case 'remove': {
			const { scooterKey, retailerId } = body as { scooterKey: string; retailerId: string };
			if (!scooterKey || !retailerId) throw error(400, 'scooterKey and retailerId are required');

			await removePurchaseLink(scooterKey, retailerId);
			return json({ success: true });
		}

		/**
		 * Replace all links for a scooter.
		 * Body: { action: 'set', scooterKey, links: PurchaseLink[] }
		 */
		case 'set': {
			const { scooterKey, links } = body as { scooterKey: string; links: PurchaseLink[] };
			if (!scooterKey) throw error(400, 'scooterKey is required');

			await setPurchaseLinks(scooterKey, links || []);
			return json({ success: true });
		}

		/**
		 * Auto-discover purchase links by checking all known retailers for a scooter.
		 * Body: { action: 'auto-discover', scooterKey, scooterName }
		 */
		case 'auto-discover': {
			const { scooterKey, scooterName } = body as { scooterKey: string; scooterName: string };
			if (!scooterKey || !scooterName) throw error(400, 'scooterKey and scooterName are required');

			const retailers = getActiveRetailers();
			const discovered: PurchaseLink[] = [];
			const errors: string[] = [];

			const retailerResults = await Promise.all(
				retailers
					.filter((r) => r.productUrlPattern)
					.map(async (retailer) => {
						const productUrl = buildProductUrl(retailer, scooterName);
						try {
							const page = await fetchPage(productUrl, 10000);
							if (page.ok && page.html.length > 1000) {
								const priceMatch = page.html.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
								const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;
								const nameWords = scooterName
									.toLowerCase()
									.split(/\s+/)
									.filter((w) => w.length > 2);
								const pageText = page.html.toLowerCase();
								const matchingWords = nameWords.filter((w) => pageText.includes(w));
								const nameConfidence = matchingWords.length / Math.max(nameWords.length, 1);
								if (nameConfidence >= 0.5) {
									const affiliateUrl = buildAffiliateUrl(productUrl, retailer);
									return {
										link: {
											retailerId: retailer.id,
											retailerName: retailer.name,
											url: affiliateUrl,
											rawUrl: productUrl,
											price: price && price > 50 && price < 15000 ? price : undefined,
											currency: 'USD',
											inStock: !pageText.includes('out of stock') && !pageText.includes('sold out'),
											lastChecked: new Date().toISOString(),
											affiliateNetwork: retailer.affiliateNetwork,
										} as PurchaseLink,
										error: null,
									};
								}
							}
						} catch (e) {
							return { link: null, error: `${retailer.name}: ${e instanceof Error ? e.message : 'Unknown error'}` };
						}
						return { link: null, error: null };
					})
			);

			for (const r of retailerResults) {
				if (r.link) discovered.push(r.link);
				if (r.error) errors.push(r.error);
			}

			// Save discovered links
			for (const link of discovered) {
				await addPurchaseLink(scooterKey, link);
			}

			await logActivity('source_added', `Auto-discovered ${discovered.length} purchase link(s) for ${scooterKey}`, {
				scooterKey,
				discovered: discovered.map((l) => l.retailerName),
				errors,
			});

			return json({ success: true, discovered: discovered.length, errors });
		}

		/**
		 * Refresh prices for all links of a scooter.
		 * Body: { action: 'refresh-prices', scooterKey }
		 */
		case 'refresh-prices': {
			const { scooterKey } = body as { scooterKey: string };
			if (!scooterKey) throw error(400, 'scooterKey is required');

			const links = await getPurchaseLinks(scooterKey);
			const updated: string[] = [];
			const errors: string[] = [];

			const refreshResults = await Promise.all(
				links.map(async (link) => {
					try {
						const page = await fetchPage(link.rawUrl, 10000);
						if (page.ok) {
							const priceMatch = page.html.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
							const newPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;
							const pageText = page.html.toLowerCase();
							link.price = newPrice && newPrice > 50 && newPrice < 15000 ? newPrice : link.price;
							link.inStock = !pageText.includes('out of stock') && !pageText.includes('sold out');
							link.lastChecked = new Date().toISOString();
							return { link, retailerName: link.retailerName, error: null };
						}
					} catch (e) {
						return {
							link: null,
							retailerName: link.retailerName,
							error: `${link.retailerName}: ${e instanceof Error ? e.message : 'Unknown error'}`,
						};
					}
					return { link: null, retailerName: link.retailerName, error: null };
				})
			);

			for (const r of refreshResults) {
				if (r.link) {
					await addPurchaseLink(scooterKey, r.link);
					updated.push(r.retailerName);
				}
				if (r.error) errors.push(r.error);
			}

			return json({ success: true, updated: updated.length, errors });
		}

		default:
			throw error(400, `Unknown action: ${action}`);
	}
};
