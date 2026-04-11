import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

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

let cache: ActivityEntry[] | null = null;

async function loadLog(): Promise<ActivityEntry[]> {
	if (cache) return cache;
	try {
		if (existsSync(LOG_FILE)) {
			const raw = await readFile(LOG_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch { /* start fresh */ }
	cache = [];
	return cache;
}

async function saveLog(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(LOG_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

export async function logActivity(
	type: ActivityType,
	summary: string,
	details?: Record<string, unknown>
): Promise<ActivityEntry> {
	const entries = await loadLog();
	const entry: ActivityEntry = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		type,
		timestamp: new Date().toISOString(),
		summary,
		details,
	};
	entries.unshift(entry);
	// Trim to max entries
	if (entries.length > MAX_ENTRIES) {
		entries.length = MAX_ENTRIES;
	}
	cache = entries;
	await saveLog();
	return entry;
}

export async function getActivityLog(
	limit = 50,
	offset = 0,
	filterType?: ActivityType
): Promise<{ entries: ActivityEntry[]; total: number }> {
	const entries = await loadLog();
	const filtered = filterType ? entries.filter((e) => e.type === filterType) : entries;
	return {
		entries: filtered.slice(offset, offset + limit),
		total: filtered.length,
	};
}

export async function clearActivityLog(): Promise<void> {
	cache = [];
	await saveLog();
}
