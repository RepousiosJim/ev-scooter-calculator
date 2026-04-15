/**
 * CRUD store for scooter purchase links.
 * Uses Supabase when SUPABASE_URL is set, falls back to file-based JSON.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { AffiliateNetwork } from './retailer-registry';
import { isSupabaseAvailable, db } from '$lib/server/db';

// Helper: access the purchase_links table which may not exist in generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purchaseTable = () => (db() as any).from('purchase_links');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PurchaseLink {
	retailerId: string;
	retailerName: string;
	url: string; // affiliate-tagged URL
	rawUrl: string; // original URL
	price?: number;
	currency: string; // defaults to 'USD'
	inStock?: boolean;
	lastChecked: string; // ISO timestamp
	affiliateNetwork: AffiliateNetwork;
}

export interface ScooterPurchaseData {
	scooterKey: string;
	links: PurchaseLink[];
	lastUpdated: string;
}

// ---------------------------------------------------------------------------
// File-based fallback
// ---------------------------------------------------------------------------

const DATA_DIR = join(process.cwd(), 'data');
const PURCHASE_FILE = join(DATA_DIR, 'purchase-links.json');

let cache: ScooterPurchaseData[] | null = null;

async function loadData(): Promise<ScooterPurchaseData[]> {
	if (cache) return cache;
	try {
		if (existsSync(PURCHASE_FILE)) {
			const raw = await readFile(PURCHASE_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch (e) {
		console.warn('[purchase-links] Failed to load purchase links file:', e);
	}
	cache = [];
	return cache;
}

async function saveData(): Promise<void> {
	if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
		throw new Error(
			'purchase-links file fallback invoked on Vercel — ' +
				'configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY so the Supabase store is used instead.'
		);
	}
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(PURCHASE_FILE, JSON.stringify(cache), 'utf-8');
}

// ---------------------------------------------------------------------------
// Row mapping (Supabase)
// ---------------------------------------------------------------------------

interface PurchaseLinkRow {
	scooter_key: string;
	retailer_id: string;
	retailer_name: string;
	url: string;
	raw_url: string;
	price: number | null;
	currency: string;
	in_stock: boolean | null;
	last_checked: string;
	affiliate_network: string;
}

function rowToLink(row: PurchaseLinkRow): PurchaseLink {
	return {
		retailerId: row.retailer_id,
		retailerName: row.retailer_name,
		url: row.url,
		rawUrl: row.raw_url,
		price: row.price ?? undefined,
		currency: row.currency,
		inStock: row.in_stock ?? undefined,
		lastChecked: row.last_checked,
		affiliateNetwork: row.affiliate_network as AffiliateNetwork,
	};
}

function linkToRow(scooterKey: string, link: PurchaseLink): PurchaseLinkRow {
	return {
		scooter_key: scooterKey,
		retailer_id: link.retailerId,
		retailer_name: link.retailerName,
		url: link.url,
		raw_url: link.rawUrl,
		price: link.price ?? null,
		currency: link.currency,
		in_stock: link.inStock ?? null,
		last_checked: link.lastChecked,
		affiliate_network: link.affiliateNetwork,
	};
}

function groupRowsByScooter(rows: PurchaseLinkRow[]): ScooterPurchaseData[] {
	const map = new Map<string, PurchaseLink[]>();
	const lastUpdatedMap = new Map<string, string>();

	for (const row of rows) {
		const key = row.scooter_key;
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(rowToLink(row));

		const prev = lastUpdatedMap.get(key);
		if (!prev || row.last_checked > prev) {
			lastUpdatedMap.set(key, row.last_checked);
		}
	}

	const result: ScooterPurchaseData[] = [];
	for (const [scooterKey, links] of map) {
		result.push({
			scooterKey,
			links,
			lastUpdated: lastUpdatedMap.get(scooterKey)!,
		});
	}
	return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get all purchase links for a specific scooter. */
export async function getPurchaseLinks(scooterKey: string): Promise<PurchaseLink[]> {
	if (isSupabaseAvailable()) {
		const { data, error } = await purchaseTable().select('*').eq('scooter_key', scooterKey);
		if (error) throw new Error(`Supabase getPurchaseLinks error: ${error.message}`);
		return (data ?? []).map((row: unknown) => rowToLink(row as PurchaseLinkRow));
	}

	const all = await loadData();
	const entry = all.find((d) => d.scooterKey === scooterKey);
	return entry?.links ?? [];
}

/** Get purchase data for all scooters. */
export async function getAllPurchaseData(): Promise<ScooterPurchaseData[]> {
	if (isSupabaseAvailable()) {
		const { data, error } = await purchaseTable().select('*');
		if (error) throw new Error(`Supabase getAllPurchaseData error: ${error.message}`);
		return groupRowsByScooter((data ?? []) as unknown as PurchaseLinkRow[]);
	}

	return loadData();
}

/** Add or update a single purchase link for a scooter (upserts by retailerId). */
export async function addPurchaseLink(scooterKey: string, link: PurchaseLink): Promise<void> {
	if (isSupabaseAvailable()) {
		const row = linkToRow(scooterKey, link);
		const { error } = await purchaseTable().upsert(row, { onConflict: 'scooter_key,retailer_id' });
		if (error) throw new Error(`Supabase addPurchaseLink error: ${error.message}`);
		return;
	}

	const all = await loadData();
	let entry = all.find((d) => d.scooterKey === scooterKey);
	if (!entry) {
		entry = { scooterKey, links: [], lastUpdated: new Date().toISOString() };
		all.push(entry);
	}
	const idx = entry.links.findIndex((l) => l.retailerId === link.retailerId);
	if (idx >= 0) {
		entry.links[idx] = link;
	} else {
		entry.links.push(link);
	}
	entry.lastUpdated = new Date().toISOString();
	cache = all;
	await saveData();
}

/** Remove a purchase link for a scooter by retailer id. */
export async function removePurchaseLink(scooterKey: string, retailerId: string): Promise<void> {
	if (isSupabaseAvailable()) {
		const { error } = await purchaseTable().delete().eq('scooter_key', scooterKey).eq('retailer_id', retailerId);
		if (error) throw new Error(`Supabase removePurchaseLink error: ${error.message}`);
		return;
	}

	const all = await loadData();
	const entry = all.find((d) => d.scooterKey === scooterKey);
	if (!entry) return;
	entry.links = entry.links.filter((l) => l.retailerId !== retailerId);
	entry.lastUpdated = new Date().toISOString();
	// Remove the entire entry if no links remain
	if (entry.links.length === 0) {
		const entryIdx = all.indexOf(entry);
		all.splice(entryIdx, 1);
	}
	cache = all;
	await saveData();
}

/** Replace all purchase links for a scooter. */
export async function setPurchaseLinks(scooterKey: string, links: PurchaseLink[]): Promise<void> {
	if (isSupabaseAvailable()) {
		// Delete existing links then insert new ones
		const { error: delError } = await purchaseTable().delete().eq('scooter_key', scooterKey);
		if (delError) throw new Error(`Supabase setPurchaseLinks delete error: ${delError.message}`);

		if (links.length > 0) {
			const rows = links.map((l) => linkToRow(scooterKey, l));
			const { error: insError } = await purchaseTable().insert(rows);
			if (insError) throw new Error(`Supabase setPurchaseLinks insert error: ${insError.message}`);
		}
		return;
	}

	const all = await loadData();
	const idx = all.findIndex((d) => d.scooterKey === scooterKey);
	const entry: ScooterPurchaseData = {
		scooterKey,
		links,
		lastUpdated: new Date().toISOString(),
	};

	if (links.length === 0) {
		// Remove entry entirely when clearing all links
		if (idx >= 0) all.splice(idx, 1);
	} else if (idx >= 0) {
		all[idx] = entry;
	} else {
		all.push(entry);
	}

	cache = all;
	await saveData();
}

/** Aggregate stats across all purchase links. */
export async function getPurchaseLinkStats(): Promise<{
	totalScooters: number;
	totalLinks: number;
	retailerCounts: Record<string, number>;
}> {
	const all = await getAllPurchaseData();
	const retailerCounts: Record<string, number> = {};
	let totalLinks = 0;

	for (const entry of all) {
		totalLinks += entry.links.length;
		for (const link of entry.links) {
			retailerCounts[link.retailerId] = (retailerCounts[link.retailerId] ?? 0) + 1;
		}
	}

	return {
		totalScooters: all.length,
		totalLinks,
		retailerCounts,
	};
}
