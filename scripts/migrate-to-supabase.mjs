/**
 * One-time migration: JSON files → Supabase
 * Run with: node scripts/migrate-to-supabase.mjs
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');

// Load .env manually (no dotenv dependency needed)
const envFile = join(ROOT, '.env');
const envVars = {};
if (existsSync(envFile)) {
	const lines = (await readFile(envFile, 'utf-8')).split('\n');
	for (const line of lines) {
		const match = line.match(/^([^#=]+)=(.*)$/);
		if (match) envVars[match[1].trim()] = match[2].trim();
	}
}

const SUPABASE_URL = envVars.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
	process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function loadJson(file) {
	const path = join(DATA, file);
	if (!existsSync(path)) {
		console.log(`  ⚠️  ${file} not found, skipping`);
		return null;
	}
	return JSON.parse(await readFile(path, 'utf-8'));
}

async function migrate() {
	console.log('🚀 Starting migration to Supabase...\n');

	// 1. Verification store
	const verificationRaw = await loadJson('verification-store.json');
	if (verificationRaw) {
		const rows = Object.entries(verificationRaw).map(([key, val]) => ({
			scooter_key: key,
			fields: val.fields ?? {},
			price_history: val.priceHistory ?? [],
			last_updated: val.lastUpdated ?? new Date().toISOString(),
			overall_confidence: val.overallConfidence ?? 0,
		}));
		const { error } = await db.from('scooter_verifications').upsert(rows, { onConflict: 'scooter_key' });
		if (error) console.error('  ❌ scooter_verifications:', error.message);
		else console.log(`  ✅ scooter_verifications: ${rows.length} rows`);
	}

	// 2. Activity log
	const activityRaw = await loadJson('activity-log.json');
	if (activityRaw && activityRaw.length > 0) {
		const rows = activityRaw.map((e) => ({
			id: e.id,
			type: e.type,
			timestamp: e.timestamp,
			summary: e.summary,
			details: e.details ?? null,
		}));
		const { error } = await db.from('activity_log').upsert(rows, { onConflict: 'id' });
		if (error) console.error('  ❌ activity_log:', error.message);
		else console.log(`  ✅ activity_log: ${rows.length} rows`);
	}

	// 3. Preset candidates
	const candidatesRaw = await loadJson('preset-candidates.json');
	if (candidatesRaw && candidatesRaw.length > 0) {
		const rows = candidatesRaw.map((c) => ({
			key: c.key,
			name: c.name,
			year: c.year,
			status: c.status,
			config: c.config ?? {},
			manufacturer_specs: c.manufacturerSpecs ?? {},
			validation: c.validation ?? {},
			sources: c.sources ?? {},
			notes: c.notes ?? null,
		}));
		const { error } = await db.from('preset_candidates').upsert(rows, { onConflict: 'key' });
		if (error) console.error('  ❌ preset_candidates:', error.message);
		else console.log(`  ✅ preset_candidates: ${rows.length} rows`);
	}

	// 4. Discovery store (runs, entries, urlHealth)
	const discoveryRaw = await loadJson('discovery-store.json');
	if (discoveryRaw) {
		// Runs
		if (discoveryRaw.runs?.length > 0) {
			const rows = discoveryRaw.runs.map((r) => ({
				id: r.id,
				started_at: r.startedAt,
				completed_at: r.completedAt ?? null,
				status: r.status,
				manufacturer_ids: r.manufacturerIds ?? [],
				total_found: r.totalFound ?? 0,
				total_new: r.totalNew ?? 0,
				total_known: r.totalKnown ?? 0,
				candidates_created: r.candidatesCreated ?? 0,
				errors: r.errors ?? [],
			}));
			const { error } = await db.from('discovery_runs').upsert(rows, { onConflict: 'id' });
			if (error) console.error('  ❌ discovery_runs:', error.message);
			else console.log(`  ✅ discovery_runs: ${rows.length} rows`);
		}

		// Entries
		if (discoveryRaw.entries?.length > 0) {
			const rows = discoveryRaw.entries.map((e) => ({
				id: e.id,
				name: e.name,
				url: e.url,
				manufacturer: e.manufacturer,
				manufacturer_id: e.manufacturerId,
				specs: e.specs ?? {},
				is_known: e.isKnown ?? false,
				matched_key: e.matchedKey ?? null,
				year: e.year ?? null,
				extraction_method: e.extractionMethod ?? null,
				discovery_run_id: e.discoveryRunId ?? null,
				discovered_at: e.discoveredAt,
				candidate_key: e.candidateKey ?? null,
				disposition: e.disposition ?? null,
			}));
			const { error } = await db.from('discovery_entries').upsert(rows, { onConflict: 'id' });
			if (error) console.error('  ❌ discovery_entries:', error.message);
			else console.log(`  ✅ discovery_entries: ${rows.length} rows`);
		}

		// URL health
		if (discoveryRaw.urlHealth && Object.keys(discoveryRaw.urlHealth).length > 0) {
			const rows = Object.values(discoveryRaw.urlHealth).map((h) => ({
				url: h.url,
				last_checked: h.lastChecked,
				last_status: h.lastStatus ?? 0,
				last_error: h.lastError ?? null,
				consecutive_failures: h.consecutiveFailures ?? 0,
				is_disabled: h.isDisabled ?? false,
				last_success: h.lastSuccess ?? null,
				products_found_last: h.productsFoundLast ?? 0,
			}));
			const { error } = await db.from('url_health').upsert(rows, { onConflict: 'url' });
			if (error) console.error('  ❌ url_health:', error.message);
			else console.log(`  ✅ url_health: ${rows.length} rows`);
		}
	}

	console.log('\n✅ Migration complete!');
}

migrate().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
