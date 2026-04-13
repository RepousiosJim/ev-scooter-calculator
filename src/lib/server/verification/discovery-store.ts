/**
 * Persistent store for discovery pipeline data.
 * Uses Supabase when SUPABASE_URL is set, falls back to file-based JSON.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { isSupabaseAvailable, db, toJson } from '$lib/server/db';

const DATA_DIR = join(process.cwd(), 'data');
const STORE_FILE = join(DATA_DIR, 'discovery-store.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveryRun {
	id: string;
	startedAt: string;
	completedAt?: string;
	status: 'running' | 'completed' | 'failed';
	manufacturerIds: string[];
	totalFound: number;
	totalNew: number;
	totalKnown: number;
	candidatesCreated: number;
	errors: string[];
}

export interface DiscoveryEntry {
	id: string;
	name: string;
	url: string;
	manufacturer: string;
	manufacturerId: string;
	specs: {
		topSpeed?: number;
		range?: number;
		batteryWh?: number;
		price?: number;
		motorWatts?: number;
		weight?: number;
	};
	isKnown: boolean;
	matchedKey?: string;
	year?: number;
	extractionMethod?: string;
	discoveryRunId: string;
	discoveredAt: string;
	candidateKey?: string;
	disposition: null | 'promoted' | 'dismissed';
}

export interface UrlHealthEntry {
	url: string;
	lastChecked: string;
	lastStatus: number;
	lastError?: string;
	consecutiveFailures: number;
	isDisabled: boolean;
	lastSuccess?: string;
	productsFoundLast: number;
}

export interface DiscoveryStoreData {
	runs: DiscoveryRun[];
	entries: DiscoveryEntry[];
	urlHealth: Record<string, UrlHealthEntry>;
}

// --- File-based fallback ---

let cache: DiscoveryStoreData | null = null;

function emptyStore(): DiscoveryStoreData {
	return { runs: [], entries: [], urlHealth: {} };
}

async function loadStore(): Promise<DiscoveryStoreData> {
	if (cache) return cache;
	try {
		if (existsSync(STORE_FILE)) {
			const raw = await readFile(STORE_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch (e) {
		console.warn('[discovery-store] Failed to load store file:', e);
	}
	cache = emptyStore();
	return cache;
}

async function saveStore(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(STORE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function rowToRun(row: Record<string, unknown>): DiscoveryRun {
	return {
		id: row.id as string,
		startedAt: row.started_at as string,
		completedAt: row.completed_at as string | undefined,
		status: row.status as DiscoveryRun['status'],
		manufacturerIds: row.manufacturer_ids as string[],
		totalFound: row.total_found as number,
		totalNew: row.total_new as number,
		totalKnown: row.total_known as number,
		candidatesCreated: row.candidates_created as number,
		errors: row.errors as string[],
	};
}

function rowToEntry(row: Record<string, unknown>): DiscoveryEntry {
	return {
		id: row.id as string,
		name: row.name as string,
		url: row.url as string,
		manufacturer: row.manufacturer as string,
		manufacturerId: row.manufacturer_id as string,
		specs: (row.specs ?? {}) as DiscoveryEntry['specs'],
		isKnown: row.is_known as boolean,
		matchedKey: row.matched_key as string | undefined,
		year: row.year as number | undefined,
		extractionMethod: row.extraction_method as string | undefined,
		discoveryRunId: row.discovery_run_id as string,
		discoveredAt: row.discovered_at as string,
		candidateKey: row.candidate_key as string | undefined,
		disposition: row.disposition as DiscoveryEntry['disposition'],
	};
}

function rowToUrlHealth(row: Record<string, unknown>): UrlHealthEntry {
	return {
		url: row.url as string,
		lastChecked: row.last_checked as string,
		lastStatus: row.last_status as number,
		lastError: row.last_error as string | undefined,
		consecutiveFailures: row.consecutive_failures as number,
		isDisabled: row.is_disabled as boolean,
		lastSuccess: row.last_success as string | undefined,
		productsFoundLast: row.products_found_last as number,
	};
}

// ---------------------------------------------------------------------------
// Run management
// ---------------------------------------------------------------------------

export async function createRun(manufacturerIds: string[]): Promise<DiscoveryRun> {
	const run: DiscoveryRun = {
		id: randomBytes(8).toString('hex'),
		startedAt: new Date().toISOString(),
		status: 'running',
		manufacturerIds,
		totalFound: 0,
		totalNew: 0,
		totalKnown: 0,
		candidatesCreated: 0,
		errors: [],
	};

	if (isSupabaseAvailable()) {
		const { error } = await db().from('discovery_runs').insert({
			id: run.id,
			started_at: run.startedAt,
			status: run.status,
			manufacturer_ids: run.manufacturerIds,
			total_found: 0,
			total_new: 0,
			total_known: 0,
			candidates_created: 0,
			errors: [],
		});
		if (error) throw new Error(`Supabase createRun error: ${error.message}`);
		return run;
	}

	const store = await loadStore();
	store.runs.unshift(run);
	cache = store;
	await saveStore();
	return run;
}

export async function completeRun(
	runId: string,
	stats: { totalFound: number; totalNew: number; totalKnown: number; candidatesCreated: number; errors: string[] }
): Promise<void> {
	if (isSupabaseAvailable()) {
		const { error } = await db()
			.from('discovery_runs')
			.update({
				status: 'completed',
				completed_at: new Date().toISOString(),
				total_found: stats.totalFound,
				total_new: stats.totalNew,
				total_known: stats.totalKnown,
				candidates_created: stats.candidatesCreated,
				errors: stats.errors,
			})
			.eq('id', runId);
		if (error) throw new Error(`Supabase completeRun error: ${error.message}`);
		return;
	}

	const store = await loadStore();
	const run = store.runs.find((r) => r.id === runId);
	if (!run) return;
	run.status = 'completed';
	run.completedAt = new Date().toISOString();
	Object.assign(run, stats);
	cache = store;
	await saveStore();
}

export async function failRun(runId: string, error: string): Promise<void> {
	if (isSupabaseAvailable()) {
		const { data } = await db().from('discovery_runs').select('errors').eq('id', runId).single();
		const existing = (data?.errors as string[]) ?? [];
		const { error: dbErr } = await db()
			.from('discovery_runs')
			.update({
				status: 'failed',
				completed_at: new Date().toISOString(),
				errors: [...existing, error],
			})
			.eq('id', runId);
		if (dbErr) throw new Error(`Supabase failRun error: ${dbErr.message}`);
		return;
	}

	const store = await loadStore();
	const run = store.runs.find((r) => r.id === runId);
	if (!run) return;
	run.status = 'failed';
	run.completedAt = new Date().toISOString();
	run.errors = [...run.errors, error];
	cache = store;
	await saveStore();
}

export async function getRecentRuns(limit = 20): Promise<DiscoveryRun[]> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db()
			.from('discovery_runs')
			.select('*')
			.order('started_at', { ascending: false })
			.limit(limit);
		if (error) throw new Error(`Supabase getRecentRuns error: ${error.message}`);
		return (data ?? []).map(rowToRun);
	}

	const store = await loadStore();
	return store.runs.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Entry management
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.trim();
}

function isUrlHealthy(h: {
	is_disabled?: boolean;
	isDisabled?: boolean;
	consecutive_failures?: number;
	consecutiveFailures?: number;
}): boolean {
	const disabled = h.is_disabled ?? h.isDisabled ?? false;
	const failures = h.consecutive_failures ?? h.consecutiveFailures ?? 0;
	return !disabled && failures < 3;
}

export async function addEntries(entries: DiscoveryEntry[]): Promise<void> {
	if (isSupabaseAvailable()) {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const { data: recentRows } = await db()
			.from('discovery_entries')
			.select('name')
			.gte('discovered_at', thirtyDaysAgo.toISOString());

		const recentNames = new Set((recentRows ?? []).map((r: { name: string }) => normalizeName(r.name)));
		const toInsert = entries.filter((e) => {
			const n = normalizeName(e.name);
			if (recentNames.has(n)) return false;
			recentNames.add(n);
			return true;
		});

		if (toInsert.length === 0) return;
		const { error } = await db()
			.from('discovery_entries')
			.insert(
				toInsert.map((e) => ({
					id: e.id,
					name: e.name,
					url: e.url,
					manufacturer: e.manufacturer,
					manufacturer_id: e.manufacturerId,
					specs: toJson(e.specs),
					is_known: e.isKnown,
					matched_key: e.matchedKey ?? null,
					year: e.year ?? null,
					extraction_method: e.extractionMethod ?? null,
					discovery_run_id: e.discoveryRunId,
					discovered_at: e.discoveredAt,
					candidate_key: e.candidateKey ?? null,
					disposition: e.disposition,
				}))
			);
		if (error) throw new Error(`Supabase addEntries error: ${error.message}`);
		return;
	}

	const store = await loadStore();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const cutoff = thirtyDaysAgo.toISOString();
	const recentNames = new Set(store.entries.filter((e) => e.discoveredAt >= cutoff).map((e) => normalizeName(e.name)));
	for (const entry of entries) {
		const normalized = normalizeName(entry.name);
		if (recentNames.has(normalized)) continue;
		store.entries.push(entry);
		recentNames.add(normalized);
	}
	cache = store;
	await saveStore();
}

export async function updateEntryDisposition(
	entryId: string,
	disposition: 'promoted' | 'dismissed',
	candidateKey?: string
): Promise<void> {
	if (isSupabaseAvailable()) {
		const updates = {
			disposition,
			...(candidateKey ? { candidate_key: candidateKey } : {}),
		};
		const { error } = await db().from('discovery_entries').update(updates).eq('id', entryId);
		if (error) throw new Error(`Supabase updateEntryDisposition error: ${error.message}`);
		return;
	}

	const store = await loadStore();
	const entry = store.entries.find((e) => e.id === entryId);
	if (!entry) return;
	entry.disposition = disposition;
	if (candidateKey) entry.candidateKey = candidateKey;
	cache = store;
	await saveStore();
}

export async function getEntriesForRun(runId: string): Promise<DiscoveryEntry[]> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db().from('discovery_entries').select('*').eq('discovery_run_id', runId);
		if (error) throw new Error(`Supabase getEntriesForRun error: ${error.message}`);
		return (data ?? []).map(rowToEntry);
	}

	const store = await loadStore();
	return store.entries.filter((e) => e.discoveryRunId === runId);
}

export async function getUnreviewedEntries(): Promise<DiscoveryEntry[]> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db()
			.from('discovery_entries')
			.select('*')
			.is('disposition', null)
			.eq('is_known', false);
		if (error) throw new Error(`Supabase getUnreviewedEntries error: ${error.message}`);
		return (data ?? []).map(rowToEntry);
	}

	const store = await loadStore();
	return store.entries.filter((e) => e.disposition === null && !e.isKnown);
}

// ---------------------------------------------------------------------------
// URL health tracking
// ---------------------------------------------------------------------------

export async function updateUrlHealth(
	url: string,
	status: number,
	error?: string,
	productsFound?: number
): Promise<void> {
	const now = new Date().toISOString();
	const success = status >= 200 && status < 400 && !error;

	if (isSupabaseAvailable()) {
		const { data: existing } = await db().from('url_health').select('*').eq('url', url).single();
		const failures = success ? 0 : (existing?.consecutive_failures ?? 0) + 1;

		const row = {
			url,
			last_checked: now,
			last_status: status,
			consecutive_failures: failures,
			is_disabled: existing?.is_disabled ?? false,
			products_found_last: productsFound ?? existing?.products_found_last ?? 0,
			last_success: success ? now : (existing?.last_success ?? null),
			last_error: success ? null : (error ?? null),
		};

		const { error: dbErr } = await db().from('url_health').upsert(row, { onConflict: 'url' });
		if (dbErr) throw new Error(`Supabase updateUrlHealth error: ${dbErr.message}`);
		return;
	}

	const store = await loadStore();
	const existing = store.urlHealth[url];
	if (success) {
		store.urlHealth[url] = {
			url,
			lastChecked: now,
			lastStatus: status,
			consecutiveFailures: 0,
			isDisabled: existing?.isDisabled ?? false,
			lastSuccess: now,
			productsFoundLast: productsFound ?? existing?.productsFoundLast ?? 0,
		};
	} else {
		const failures = (existing?.consecutiveFailures ?? 0) + 1;
		store.urlHealth[url] = {
			url,
			lastChecked: now,
			lastStatus: status,
			lastError: error,
			consecutiveFailures: failures,
			isDisabled: existing?.isDisabled ?? false,
			lastSuccess: existing?.lastSuccess,
			productsFoundLast: existing?.productsFoundLast ?? 0,
		};
	}
	cache = store;
	await saveStore();
}

export async function getUrlHealth(): Promise<Record<string, UrlHealthEntry>> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db().from('url_health').select('*');
		if (error) throw new Error(`Supabase getUrlHealth error: ${error.message}`);
		const result: Record<string, UrlHealthEntry> = {};
		for (const row of data ?? []) result[row.url] = rowToUrlHealth(row);
		return result;
	}

	const store = await loadStore();
	return store.urlHealth;
}

export function getHealthyUrls(manufacturerUrls: string[]): string[] {
	if (!cache) return manufacturerUrls;
	return manufacturerUrls.filter((url) => {
		const health = cache!.urlHealth[url];
		if (!health) return true;
		return isUrlHealthy(health);
	});
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export async function recoverOrphanedRuns(): Promise<number> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db()
			.from('discovery_runs')
			.update({
				status: 'failed',
				completed_at: new Date().toISOString(),
			})
			.eq('status', 'running')
			.select();
		if (error) throw new Error(`Supabase recoverOrphanedRuns error: ${error.message}`);
		return (data ?? []).length;
	}

	const store = await loadStore();
	let count = 0;
	for (const run of store.runs) {
		if (run.status === 'running') {
			run.status = 'failed';
			run.completedAt = new Date().toISOString();
			run.errors = [...run.errors, 'Recovered: run was orphaned (server restart or crash)'];
			count++;
		}
	}
	if (count > 0) {
		cache = store;
		await saveStore();
	}
	return count;
}

export async function getStats(): Promise<{
	totalRuns: number;
	totalEntries: number;
	totalNew: number;
	pendingReview: number;
	healthyUrls: number;
	deadUrls: number;
}> {
	if (isSupabaseAvailable()) {
		const [runsRes, entriesRes, newRes, pendingRes, healthRes] = await Promise.all([
			db().from('discovery_runs').select('*', { count: 'exact', head: true }),
			db().from('discovery_entries').select('*', { count: 'exact', head: true }),
			db().from('discovery_entries').select('*', { count: 'exact', head: true }).eq('is_known', false),
			db()
				.from('discovery_entries')
				.select('*', { count: 'exact', head: true })
				.is('disposition', null)
				.eq('is_known', false),
			db().from('url_health').select('consecutive_failures, is_disabled'),
		]);
		const health = healthRes.data ?? [];
		return {
			totalRuns: runsRes.count ?? 0,
			totalEntries: entriesRes.count ?? 0,
			totalNew: newRes.count ?? 0,
			pendingReview: pendingRes.count ?? 0,
			healthyUrls: health.filter(isUrlHealthy).length,
			deadUrls: health.filter((h) => !isUrlHealthy(h)).length,
		};
	}

	const store = await loadStore();
	const totalNew = store.entries.filter((e) => !e.isKnown).length;
	const pendingReview = store.entries.filter((e) => e.disposition === null && !e.isKnown).length;
	const healthEntries = Object.values(store.urlHealth);
	return {
		totalRuns: store.runs.length,
		totalEntries: store.entries.length,
		totalNew,
		pendingReview,
		healthyUrls: healthEntries.filter(isUrlHealthy).length,
		deadUrls: healthEntries.filter((h) => !isUrlHealthy(h)).length,
	};
}
