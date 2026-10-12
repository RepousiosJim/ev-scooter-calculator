/**
 * Pipeline orchestration module.
 * Connects the discovery, candidate, and verification stages of the unified
 * discovery pipeline. Each function handles a specific lifecycle transition.
 */
import { randomBytes } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

import { addCandidates } from './candidate-store';
import { createCandidate, type PresetCandidate } from './preset-generator';
import { getStore, addSource } from './store';
import type { SpecField, SourceEntry } from './types';
import type { KnownSource } from './known-sources';
import { logActivity } from './activity-log';
import { runAutoFix } from './auto-fix';
import type { DiscoveredScooter } from './discovery';
import type { ScooterConfig } from '$lib/types';
import { db, isSupabaseAvailable } from '$lib/server/db';

const DATA_DIR = join(process.cwd(), 'data');
const DYNAMIC_SOURCES_FILE = join(DATA_DIR, 'dynamic-sources.json');

// ---------------------------------------------------------------------------
// Dynamic sources storage: Supabase `source_urls` when configured (Vercel's
// filesystem is read-only), else data/dynamic-sources.json for local dev.
// ---------------------------------------------------------------------------

interface DynamicSourcesData {
	[scooterKey: string]: KnownSource[];
}

async function loadDynamicSources(): Promise<DynamicSourcesData> {
	try {
		if (existsSync(DYNAMIC_SOURCES_FILE)) {
			const raw = await readFile(DYNAMIC_SOURCES_FILE, 'utf-8');
			return JSON.parse(raw);
		}
	} catch {
		/* start fresh */
	}
	return {};
}

async function saveDynamicSources(data: DynamicSourcesData): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(DYNAMIC_SOURCES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// onDiscoveryComplete
// ---------------------------------------------------------------------------

/**
 * Called after a discovery run finds new scooters.
 * Converts discovered scooters to PresetCandidate objects and feeds them
 * into the candidate store for admin review.
 */
export async function onDiscoveryComplete(
	runId: string,
	newScooters: DiscoveredScooter[]
): Promise<{ candidatesCreated: number; skipped: number }> {
	if (newScooters.length === 0) {
		return { candidatesCreated: 0, skipped: 0 };
	}

	// Convert each discovered scooter into a PresetCandidate
	const candidates: PresetCandidate[] = newScooters.map((scooter) => createCandidate(scooter));

	// Add to candidate store (skips duplicates by key)
	const { added, skipped } = await addCandidates(candidates);

	await logActivity('discovery_completed', `Pipeline: ${added} candidate(s) created from discovery run ${runId}`, {
		runId,
		candidatesCreated: added,
		skipped,
		totalNewScooters: newScooters.length,
	});

	return { candidatesCreated: added, skipped };
}

// ---------------------------------------------------------------------------
// onCandidateApproved
// ---------------------------------------------------------------------------

/** Spec field mapping from manufacturerSpecs keys to SpecField + unit. */
const MANUFACTURER_SPEC_MAP: Record<string, { field: SpecField; unit: string }> = {
	topSpeed: { field: 'topSpeed', unit: 'km/h' },
	range: { field: 'range', unit: 'km' },
	batteryWh: { field: 'batteryWh', unit: 'Wh' },
	price: { field: 'price', unit: 'USD' },
	motorWatts: { field: 'motorWatts', unit: 'W' },
	weight: { field: 'weight', unit: 'kg' },
	wheelSize: { field: 'wheelSize', unit: 'in' },
};

/** Config field mapping from ScooterConfig keys to SpecField + unit. */
const CONFIG_SPEC_MAP: Record<
	string,
	{ field: SpecField; unit: string; transform?: (config: ScooterConfig) => number | undefined }
> = {
	v: {
		field: 'voltage',
		unit: 'V',
		transform: (config) => config.v,
	},
	motorWatts: {
		field: 'motorWatts',
		unit: 'W',
		transform: (config) => (config.watts && config.motors ? config.watts * config.motors : undefined),
	},
	weight: {
		field: 'weight',
		unit: 'kg',
		transform: (config) => config.scooterWeight,
	},
	wheelSize: {
		field: 'wheelSize',
		unit: 'in',
		transform: (config) => config.wheel,
	},
};

/**
 * Called when an admin approves a preset candidate.
 * Seeds the verification store with manufacturer specs, adds dynamic sources,
 * and runs auto-fix to fill remaining gaps.
 */
export async function onCandidateApproved(candidateKey: string, candidate: PresetCandidate): Promise<void> {
	const store = await getStore();

	// 1. Seed verification store from manufacturerSpecs
	for (const [specKey, mapping] of Object.entries(MANUFACTURER_SPEC_MAP)) {
		const rawValue = candidate.manufacturerSpecs[specKey as keyof typeof candidate.manufacturerSpecs];
		if (rawValue === undefined || rawValue === null || typeof rawValue !== 'number') continue;
		const value: number = rawValue;

		const sourceEntry: SourceEntry = {
			id: randomBytes(8).toString('hex'),
			type: 'manufacturer',
			name: `${candidate.name} - Manufacturer Spec`,
			url: candidate.sources.discoveredFrom,
			value,
			unit: mapping.unit,
			fetchedAt: new Date().toISOString(),
			addedBy: 'manual',
			notes: 'Auto-seeded from approved candidate',
		};

		await addSource(store, candidateKey, mapping.field, sourceEntry);
	}

	// 2. Seed from config values (voltage, total motor watts, weight, wheelSize)
	const config = candidate.config;
	for (const [, mapping] of Object.entries(CONFIG_SPEC_MAP)) {
		const value = mapping.transform ? mapping.transform(config) : undefined;
		if (value === undefined || value === null) continue;

		// Skip if we already seeded this field from manufacturerSpecs
		const alreadySeeded = Object.entries(MANUFACTURER_SPEC_MAP).some(
			([specKey, mMapping]) =>
				mMapping.field === mapping.field &&
				candidate.manufacturerSpecs[specKey as keyof typeof candidate.manufacturerSpecs] !== undefined
		);
		if (alreadySeeded) continue;

		const sourceEntry: SourceEntry = {
			id: randomBytes(8).toString('hex'),
			type: 'manufacturer',
			name: `${candidate.name} - Config Derived`,
			value,
			unit: mapping.unit,
			fetchedAt: new Date().toISOString(),
			addedBy: 'manual',
			notes: 'Auto-seeded from approved candidate config',
		};

		await addSource(store, candidateKey, mapping.field, sourceEntry);
	}

	// 3. Add dynamic known source from the candidate's discovery URL
	if (candidate.sources.discoveredFrom) {
		await addDynamicSource(candidateKey, {
			name: `${candidate.name} - Discovery Source`,
			type: 'manufacturer',
			url: candidate.sources.discoveredFrom,
		});
	}

	// 4. Run auto-fix to fill any remaining gaps
	await runAutoFix(['seed']);

	// 5. Log activity
	await logActivity(
		'discovery_completed',
		`Pipeline: candidate "${candidate.name}" approved and seeded into verification store`,
		{
			candidateKey,
			candidateName: candidate.name,
			specsSeeded: Object.keys(candidate.manufacturerSpecs).filter(
				(k) => candidate.manufacturerSpecs[k as keyof typeof candidate.manufacturerSpecs] !== undefined
			),
		}
	);
}

// ---------------------------------------------------------------------------
// onCandidateRejected
// ---------------------------------------------------------------------------

/**
 * Called when an admin rejects a preset candidate.
 * Removes any dynamic sources that were added for this candidate.
 */
export async function onCandidateRejected(candidateKey: string): Promise<void> {
	await removeDynamicSources(candidateKey);

	await logActivity('discovery_completed', `Pipeline: candidate "${candidateKey}" rejected, dynamic sources removed`, {
		candidateKey,
	});
}

// ---------------------------------------------------------------------------
// Dynamic sources management
// ---------------------------------------------------------------------------

/** Dynamic known sources for a scooter key. */
export async function getDynamicSources(scooterKey: string): Promise<KnownSource[]> {
	if (isSupabaseAvailable()) {
		const { data, error } = await db()
			.from('source_urls')
			.select('name, type, url')
			.eq('scooter_key', scooterKey)
			.order('created_at');
		if (error) throw new Error(`source_urls read failed: ${error.message}`);
		return (data ?? []) as KnownSource[];
	}
	const data = await loadDynamicSources();
	return data[scooterKey] || [];
}

/** Add a known source for a scooter key (deduplicated by URL). */
export async function addDynamicSource(scooterKey: string, source: KnownSource): Promise<void> {
	if (isSupabaseAvailable()) {
		const { error } = await db()
			.from('source_urls')
			.upsert(
				{ scooter_key: scooterKey, url: source.url, name: source.name, type: source.type },
				{ onConflict: 'scooter_key,url', ignoreDuplicates: true }
			);
		if (error) throw new Error(`source_urls write failed: ${error.message}`);
		return;
	}

	const data = await loadDynamicSources();
	if (!data[scooterKey]) {
		data[scooterKey] = [];
	}
	if (!data[scooterKey].some((s) => s.url === source.url)) {
		data[scooterKey].push(source);
	}
	await saveDynamicSources(data);
}

/** Remove all dynamic sources for a scooter key. */
export async function removeDynamicSources(scooterKey: string): Promise<void> {
	if (isSupabaseAvailable()) {
		const { error } = await db().from('source_urls').delete().eq('scooter_key', scooterKey);
		if (error) throw new Error(`source_urls delete failed: ${error.message}`);
		return;
	}
	const data = await loadDynamicSources();
	if (data[scooterKey]) {
		delete data[scooterKey];
		await saveDynamicSources(data);
	}
}
