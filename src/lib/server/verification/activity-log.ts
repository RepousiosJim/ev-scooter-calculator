import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { isSupabaseAvailable, db, toJson } from '$lib/server/db';

const DATA_DIR = join(process.cwd(), 'data');
const LOG_FILE = join(DATA_DIR, 'activity-log.json');
const MAX_ENTRIES = 500;

export type ActivityType =
	| 'scan_started'
	| 'scan_completed'
	| 'scan_failed'
	| 'discovery_started'
	| 'discovery_completed'
	| 'discovery_failed'
	| 'source_added'
	| 'source_removed'
	| 'status_changed'
	| 'price_added'
	| 'seed_completed'
	| 'auto_fix_completed'
	| 'settings_changed'
	| 'login'
	| 'export';

export interface ActivityEntry {
	id: string;
	type: ActivityType;
	timestamp: string;
	summary: string;
	details?: Record<string, unknown>;
}

// --- File-based fallback ---

let cache: ActivityEntry[] | null = null;

async function loadLog(): Promise<ActivityEntry[]> {
	if (cache) return cache;
	try {
		if (existsSync(LOG_FILE)) {
			const raw = await readFile(LOG_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch (e) {
		console.warn('[activity-log] Failed to load log file:', e);
	}
	cache = [];
	return cache;
}

async function saveLog(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(LOG_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function logActivity(
	type: ActivityType,
	summary: string,
	details?: Record<string, unknown>
): Promise<ActivityEntry> {
	const entry: ActivityEntry = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		type,
		timestamp: new Date().toISOString(),
		summary,
		details,
	};

	if (isSupabaseAvailable()) {
		const { error } = await db()
			.from('activity_log')
			.insert({
				id: entry.id,
				type: entry.type,
				timestamp: entry.timestamp,
				summary: entry.summary,
				details: entry.details ? toJson(entry.details) : null,
			});
		if (error) throw new Error(`Supabase logActivity error: ${error.message}`);
		return entry;
	}

	const entries = await loadLog();
	entries.unshift(entry);
	if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
	cache = entries;
	await saveLog();
	return entry;
}

export async function getActivityLog(
	limit = 50,
	offset = 0,
	filterType?: ActivityType
): Promise<{ entries: ActivityEntry[]; total: number }> {
	if (isSupabaseAvailable()) {
		let query = db()
			.from('activity_log')
			.select('*', { count: 'exact' })
			.order('timestamp', { ascending: false })
			.range(offset, offset + limit - 1);

		if (filterType) query = query.eq('type', filterType);

		const { data, count, error } = await query;
		if (error) throw new Error(`Supabase getActivityLog error: ${error.message}`);
		return {
			entries: (data ?? []).map(rowToEntry),
			total: count ?? 0,
		};
	}

	const entries = await loadLog();
	const filtered = filterType ? entries.filter((e) => e.type === filterType) : entries;
	return {
		entries: filtered.slice(offset, offset + limit),
		total: filtered.length,
	};
}

export async function clearActivityLog(): Promise<void> {
	if (isSupabaseAvailable()) {
		const { error } = await db().from('activity_log').delete().neq('id', '');
		if (error) throw new Error(`Supabase clearActivityLog error: ${error.message}`);
		return;
	}

	cache = [];
	await saveLog();
}

function rowToEntry(row: Record<string, unknown>): ActivityEntry {
	return {
		id: row.id as string,
		type: row.type as ActivityType,
		timestamp: row.timestamp as string,
		summary: row.summary as string,
		details: row.details as Record<string, unknown> | undefined,
	};
}
