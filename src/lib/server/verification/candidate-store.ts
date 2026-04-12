/**
 * File-based store for preset candidates.
 * Candidates are discovered scooters that have been converted to ScooterConfig
 * and are awaiting admin review before being added to presets.ts.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { PresetCandidate } from './preset-generator';

const DATA_DIR = join(process.cwd(), 'data');
const CANDIDATES_FILE = join(DATA_DIR, 'preset-candidates.json');

let cache: PresetCandidate[] | null = null;

async function loadCandidates(): Promise<PresetCandidate[]> {
	if (cache) return cache;
	try {
		if (existsSync(CANDIDATES_FILE)) {
			const raw = await readFile(CANDIDATES_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch { /* start fresh */ }
	cache = [];
	return cache;
}

async function saveCandidates(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(CANDIDATES_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/** Get all candidates, optionally filtered by status */
export async function getCandidates(
	status?: PresetCandidate['status']
): Promise<PresetCandidate[]> {
	const all = await loadCandidates();
	if (!status) return all;
	return all.filter((c) => c.status === status);
}

/** Get a single candidate by key */
export async function getCandidate(key: string): Promise<PresetCandidate | null> {
	const all = await loadCandidates();
	return all.find((c) => c.key === key) || null;
}

/** Add or update a candidate */
export async function upsertCandidate(candidate: PresetCandidate): Promise<void> {
	const all = await loadCandidates();
	const idx = all.findIndex((c) => c.key === candidate.key);
	if (idx >= 0) {
		all[idx] = candidate;
	} else {
		all.push(candidate);
	}
	cache = all;
	await saveCandidates();
}

/** Add multiple candidates at once (skips duplicates) */
export async function addCandidates(candidates: PresetCandidate[]): Promise<{ added: number; skipped: number }> {
	const all = await loadCandidates();
	const existingKeys = new Set(all.map((c) => c.key));
	let added = 0;
	let skipped = 0;

	for (const candidate of candidates) {
		if (existingKeys.has(candidate.key)) {
			skipped++;
		} else {
			all.push(candidate);
			existingKeys.add(candidate.key);
			added++;
		}
	}

	cache = all;
	await saveCandidates();
	return { added, skipped };
}

/** Update candidate status */
export async function updateCandidateStatus(
	key: string,
	status: PresetCandidate['status'],
	notes?: string
): Promise<PresetCandidate | null> {
	const all = await loadCandidates();
	const candidate = all.find((c) => c.key === key);
	if (!candidate) return null;

	candidate.status = status;
	if (notes !== undefined) candidate.notes = notes;

	cache = all;
	await saveCandidates();
	return candidate;
}

/** Update a candidate's config (admin edit) */
export async function updateCandidateConfig(
	key: string,
	updates: Partial<PresetCandidate>
): Promise<PresetCandidate | null> {
	const all = await loadCandidates();
	const candidate = all.find((c) => c.key === key);
	if (!candidate) return null;

	// Only allow safe fields to be updated
	if (updates.config) candidate.config = { ...candidate.config, ...updates.config };
	if (updates.name) candidate.name = updates.name;
	if (updates.year) candidate.year = updates.year;
	if (updates.manufacturerSpecs) candidate.manufacturerSpecs = { ...candidate.manufacturerSpecs, ...updates.manufacturerSpecs };
	if (updates.notes !== undefined) candidate.notes = updates.notes;

	cache = all;
	await saveCandidates();
	return candidate;
}

/** Remove a candidate entirely */
export async function removeCandidate(key: string): Promise<boolean> {
	const all = await loadCandidates();
	const idx = all.findIndex((c) => c.key === key);
	if (idx < 0) return false;
	all.splice(idx, 1);
	cache = all;
	await saveCandidates();
	return true;
}

/** Get summary stats */
export async function getCandidateStats(): Promise<{
	total: number;
	pending: number;
	approved: number;
	rejected: number;
	avgConfidence: number;
}> {
	const all = await loadCandidates();
	const pending = all.filter((c) => c.status === 'pending').length;
	const approved = all.filter((c) => c.status === 'approved').length;
	const rejected = all.filter((c) => c.status === 'rejected').length;
	const avgConfidence = all.length > 0
		? all.reduce((sum, c) => sum + c.validation.confidence, 0) / all.length
		: 0;

	return { total: all.length, pending, approved, rejected, avgConfidence: Math.round(avgConfidence) };
}
