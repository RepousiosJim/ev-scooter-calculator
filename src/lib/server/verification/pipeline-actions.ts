/**
 * Pipeline orchestration module.
 * Connects the discovery, candidate, and verification stages of the unified
 * discovery pipeline. Each function handles a specific lifecycle transition.
 */
import { randomBytes } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
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

const DATA_DIR = join(process.cwd(), 'data');
const DYNAMIC_SOURCES_FILE = join(DATA_DIR, 'dynamic-sources.json');

// ---------------------------------------------------------------------------
// Dynamic sources file helpers
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
		const value = candidate.manufacturerSpecs[specKey as keyof typeof candidate.manufacturerSpecs];
		if (value === undefined || value === null) continue;

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
	// Remove dynamic sources for this key
	const data = await loadDynamicSources();
	if (data[candidateKey]) {
		delete data[candidateKey];
		await saveDynamicSources(data);
	}

	await logActivity('discovery_completed', `Pipeline: candidate "${candidateKey}" rejected, dynamic sources removed`, {
		candidateKey,
	});
}

// ---------------------------------------------------------------------------
// Dynamic sources management
// ---------------------------------------------------------------------------

/**
 * Get dynamic known sources for a specific scooter key.
 */
export function getDynamicSources(scooterKey: string): KnownSource[] {
	// Synchronous read attempt — if the file hasn't been loaded we return empty.
	// For a fully async version callers should use loadDynamicSources directly.
	try {
		if (!existsSync(DYNAMIC_SOURCES_FILE)) return [];
		// We do a synchronous JSON parse here for simplicity in non-async contexts.
		// In practice, the file is small and this is acceptable.
		const raw = readFileSync(DYNAMIC_SOURCES_FILE, 'utf-8');
		const data: DynamicSourcesData = JSON.parse(raw);
		return data[scooterKey] || [];
	} catch {
		return [];
	}
}

/**
 * Add a known source to the dynamic sources file for a scooter key.
 */
export async function addDynamicSource(scooterKey: string, source: KnownSource): Promise<void> {
	const data = await loadDynamicSources();

	if (!data[scooterKey]) {
		data[scooterKey] = [];
	}

	// Deduplicate by URL
	const existing = data[scooterKey].find((s) => s.url === source.url);
	if (!existing) {
		data[scooterKey].push(source);
	}

	await saveDynamicSources(data);
}
