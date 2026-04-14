/**
 * Store for preset candidates.
 * Uses Supabase when SUPABASE_URL is set, falls back to file-based JSON.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { PresetCandidate } from './preset-generator';
import { isSupabaseAvailable, db, toJson } from '$lib/server/db';

const DATA_DIR = join(process.cwd(), 'data');
const CANDIDATES_FILE = join(DATA_DIR, 'preset-candidates.json');

// --- File-based fallback ---

let cache: PresetCandidate[] | null = null;

async function loadCandidates(): Promise<PresetCandidate[]> {
	if (cache) return cache;
	try {
		if (existsSync(CANDIDATES_FILE)) {
			const raw = await readFile(CANDIDATES_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch (e) {
		console.warn('[candidate-store] Failed to load candidates file:', e);
	}
	cache = [];
	return cache;
}

async function saveCandidates(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(CANDIDATES_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function rowToCandidate(row: Record<string, unknown>): PresetCandidate {
	const validation = row.validation as PresetCandidate['validation'] & { specsQuality?: string };
	// specsQuality is embedded in validation JSON for Supabase compatibility
	const specsQuality = (validation?.specsQuality ||
		(row as Record<string, unknown>).specsQuality ||
		'partial') as PresetCandidate['specsQuality'];
	return {
		key: row.key as string,
		name: row.name as string,
		year: row.year as number,
		config: row.config as PresetCandidate['config'],
		manufacturerSpecs: row.manufacturer_specs as PresetCandidate['manufacturerSpecs'],
		validation,
		specsQuality,
		sources: row.sources as PresetCandidate['sources'],
		status: row.status as PresetCandidate['status'],
		notes: row.notes as string | undefined,
	};
}

function candidateToRow(c: PresetCandidate) {
	// Note: specs_quality is stored in the validation JSON for Supabase compatibility
	// (avoids needing a schema migration for the new column)
	const validationWithQuality = { ...c.validation, specsQuality: c.specsQuality || 'partial' };
	return {
		key: c.key,
		name: c.name,
		year: c.year,
		config: toJson(c.config),
		manufacturer_specs: toJson(c.manufacturerSpecs),
		validation: toJson(validationWithQuality),
		sources: toJson(c.sources),
		status: c.status,
		notes: c.notes ?? null,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCandidates(status?: PresetCandidate['status']): Promise<PresetCandidate[]> {
	if (isSupabaseAvailable()) {
		let query = db().from('preset_candidates').select('*');
		if (status) query = query.eq('status', status);
		const { data, error } = await query;
		if (error) throw new Error(`Supabase getCandidates error: ${error.message}`);
		return (data ?? []).map(rowToCandidate);
	}

	const all = await loadCandidates();
	if (!status) return all;
	return all.filter((c) => c.status === status);
}

export async function getCandidate(key: string): Promise<PresetCandidate | null> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db().from('preset_candidates').select('*').eq('key', key).single();
		if (error || !data) return null;
		return rowToCandidate(data);
	}

	const all = await loadCandidates();
	return all.find((c) => c.key === key) || null;
}

export async function upsertCandidate(candidate: PresetCandidate): Promise<void> {
	if (isSupabaseAvailable()) {
		const { error } = await db().from('preset_candidates').upsert(candidateToRow(candidate), { onConflict: 'key' });
		if (error) throw new Error(`Supabase upsertCandidate error: ${error.message}`);
		return;
	}

	const all = await loadCandidates();
	const idx = all.findIndex((c) => c.key === candidate.key);
	if (idx >= 0) all[idx] = candidate;
	else all.push(candidate);
	cache = all;
	await saveCandidates();
}

export async function addCandidates(candidates: PresetCandidate[]): Promise<{ added: number; skipped: number }> {
	if (isSupabaseAvailable()) {
		const existing = await getCandidates();
		const existingKeys = new Set(existing.map((c) => c.key));
		const toInsert = candidates.filter((c) => !existingKeys.has(c.key));
		if (toInsert.length > 0) {
			const { error } = await db().from('preset_candidates').insert(toInsert.map(candidateToRow));
			if (error) throw new Error(`Supabase addCandidates error: ${error.message}`);
		}
		return { added: toInsert.length, skipped: candidates.length - toInsert.length };
	}

	const all = await loadCandidates();
	const existingKeys = new Set(all.map((c) => c.key));
	let added = 0,
		skipped = 0;
	for (const candidate of candidates) {
		if (existingKeys.has(candidate.key)) {
			skipped++;
			continue;
		}
		all.push(candidate);
		existingKeys.add(candidate.key);
		added++;
	}
	cache = all;
	await saveCandidates();
	return { added, skipped };
}

export async function updateCandidateStatus(
	key: string,
	status: PresetCandidate['status'],
	notes?: string
): Promise<PresetCandidate | null> {
	if (isSupabaseAvailable()) {
		const updates = { status, ...(notes !== undefined ? { notes } : {}) };
		const { data, error } = await db().from('preset_candidates').update(updates).eq('key', key).select().single();
		if (error || !data) return null;
		return rowToCandidate(data);
	}

	const all = await loadCandidates();
	const candidate = all.find((c) => c.key === key);
	if (!candidate) return null;
	candidate.status = status;
	if (notes !== undefined) candidate.notes = notes;
	cache = all;
	await saveCandidates();
	return candidate;
}

function applyConfigUpdates(candidate: PresetCandidate, updates: Partial<PresetCandidate>): void {
	if (updates.config) candidate.config = { ...candidate.config, ...updates.config };
	if (updates.name) candidate.name = updates.name;
	if (updates.year) candidate.year = updates.year;
	if (updates.manufacturerSpecs)
		candidate.manufacturerSpecs = { ...candidate.manufacturerSpecs, ...updates.manufacturerSpecs };
	if (updates.notes !== undefined) candidate.notes = updates.notes;
}

export async function updateCandidateConfig(
	key: string,
	updates: Partial<PresetCandidate>
): Promise<PresetCandidate | null> {
	if (isSupabaseAvailable()) {
		const candidate = await getCandidate(key);
		if (!candidate) return null;
		applyConfigUpdates(candidate, updates);
		const { data, error } = await db()
			.from('preset_candidates')
			.update(candidateToRow(candidate))
			.eq('key', key)
			.select()
			.single();
		if (error || !data) return null;
		return rowToCandidate(data);
	}

	const all = await loadCandidates();
	const candidate = all.find((c) => c.key === key);
	if (!candidate) return null;
	applyConfigUpdates(candidate, updates);
	cache = all;
	await saveCandidates();
	return candidate;
}

export async function removeCandidate(key: string): Promise<boolean> {
	if (isSupabaseAvailable()) {
		const { error, count } = await db().from('preset_candidates').delete().eq('key', key);
		if (error) throw new Error(`Supabase removeCandidate error: ${error.message}`);
		return (count ?? 0) > 0;
	}

	const all = await loadCandidates();
	const idx = all.findIndex((c) => c.key === key);
	if (idx < 0) return false;
	all.splice(idx, 1);
	cache = all;
	await saveCandidates();
	return true;
}

export async function getCandidateStats(): Promise<{
	total: number;
	pending: number;
	approved: number;
	rejected: number;
	avgConfidence: number;
}> {
	const all = await getCandidates();
	const pending = all.filter((c) => c.status === 'pending').length;
	const approved = all.filter((c) => c.status === 'approved').length;
	const rejected = all.filter((c) => c.status === 'rejected').length;
	const avgConfidence = all.length > 0 ? all.reduce((sum, c) => sum + c.validation.confidence, 0) / all.length : 0;
	return { total: all.length, pending, approved, rejected, avgConfidence: Math.round(avgConfidence) };
}
