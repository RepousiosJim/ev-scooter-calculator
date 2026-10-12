/**
 * Keeps the verification store in step with the calculator catalog.
 *
 * Each catalog scooter gets one "Catalog" source per spec field, with a stable id
 * (`catalog-<field>`), so a sync updates it in place when presets.ts changes
 * instead of piling up stale copies. The sync also:
 * - removes the old auto-seeded and curated-seed sources, which never refreshed
 *   and went stale after the October 2026 catalog audit;
 * - collapses duplicate price observations;
 * - merges records stored under renamed/merged preset keys into the current key,
 *   and deletes records for presets removed from the catalog.
 *
 * It only writes records that actually change, so running it on every cold start
 * is cheap once the store is in sync.
 */

import type { ScooterVerification, SourceEntry, SpecField, PriceObservation } from './types';
import { SPEC_FIELD_UNITS } from './types';
import type { VerificationStore } from './store';
import { createEmptyVerification } from './store';
import { computeConfidence, computeOverallConfidence } from './confidence';
import { presets, presetMetadata } from '$lib/data/presets';
import { presetAliases, removedPresetKeys } from '$lib/data/preset-aliases';

const CATALOG_ID_PREFIX = 'catalog-';
const CATALOG_NOTES = 'Synced from the calculator catalog (presets.ts)';
const WRITE_BATCH = 50;

/** Sources written by the old seeding code; they never refreshed. */
const LEGACY_SEED_NOTES = new Set([
	'Auto-seeded from preset manufacturer specifications',
	'Pre-seeded from curated database',
]);

export function isCatalogSource(source: SourceEntry): boolean {
	return source.id.startsWith(CATALOG_ID_PREFIX);
}

function isLegacySeedSource(source: SourceEntry): boolean {
	return source.notes !== undefined && LEGACY_SEED_NOTES.has(source.notes);
}

/** The catalog's value for each spec field of a preset. Motor power is the total peak. */
export function catalogSpecs(key: string): Partial<Record<SpecField, number>> {
	const meta = presetMetadata[key];
	const config = presets[key];
	if (!meta || !config) return {};
	const specs: Partial<Record<SpecField, number>> = {
		topSpeed: meta.manufacturer.topSpeed,
		range: meta.manufacturer.range,
		batteryWh: meta.manufacturer.batteryWh,
		price: meta.manufacturer.price,
		voltage: config.v,
		motorWatts: config.watts && config.motors ? config.watts * config.motors : undefined,
		weight: config.scooterWeight,
		wheelSize: config.wheel,
	};
	for (const field of Object.keys(specs) as SpecField[]) {
		const value = specs[field];
		if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) delete specs[field];
	}
	return specs;
}

function catalogSource(key: string, field: SpecField, value: number): SourceEntry {
	return {
		id: `${CATALOG_ID_PREFIX}${field}`,
		type: 'manufacturer',
		name: field === 'motorWatts' ? 'Catalog (total peak power)' : 'Catalog',
		url: presetMetadata[key]?.sourceUrl,
		value,
		unit: SPEC_FIELD_UNITS[field],
		fetchedAt: new Date().toISOString(),
		addedBy: 'manual',
		notes: CATALOG_NOTES,
	};
}

/** Keep the earliest observation of each (source, price, currency). */
function dedupePrices(history: PriceObservation[]): PriceObservation[] {
	const byKey = new Map<string, PriceObservation>();
	for (const obs of history) {
		const k = `${obs.source}|${obs.price}|${obs.currency}`;
		const prev = byKey.get(k);
		if (!prev || new Date(obs.observedAt) < new Date(prev.observedAt)) byKey.set(k, obs);
	}
	return [...byKey.values()].sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}

/**
 * Bring one record in line with the catalog. Returns the updated record, or null
 * when nothing changed. Pure apart from timestamps; exported for tests.
 */
export function syncRecord(key: string, existing: ScooterVerification | null): ScooterVerification | null {
	const record: ScooterVerification = existing ? structuredClone(existing) : createEmptyVerification(key);
	const specs = catalogSpecs(key);
	let changed = !existing;

	const fields = new Set<SpecField>([
		...(Object.keys(record.fields) as SpecField[]),
		...(Object.keys(specs) as SpecField[]),
	]);

	for (const field of fields) {
		const fv = record.fields[field] ?? { status: 'unverified' as const, sources: [], confidence: 0 };
		const before = fv.sources;
		let sources = before.filter((s) => !isLegacySeedSource(s));

		const value = specs[field];
		const current = sources.find((s) => s.id === `${CATALOG_ID_PREFIX}${field}`);
		if (value === undefined) {
			sources = sources.filter((s) => !isCatalogSource(s));
		} else if (!current || current.value !== value) {
			sources = [...sources.filter((s) => !isCatalogSource(s)), catalogSource(key, field, value)];
		}

		const fieldChanged =
			sources.length !== before.length || sources.some((s, i) => s !== before[i]) || !record.fields[field];
		if (!fieldChanged) continue;
		changed = true;

		if (sources.length === 0 && fv.status === 'unverified') {
			delete record.fields[field];
			continue;
		}
		fv.sources = sources;
		fv.confidence = computeConfidence(sources);
		// An automatic resolution was based on the old sources; let it be recomputed.
		if (fv.notes?.startsWith('Auto-resolved')) {
			fv.verifiedValue = undefined;
			fv.notes = undefined;
		}
		record.fields[field] = fv;
	}

	const prices = dedupePrices(record.priceHistory);
	if (prices.length !== record.priceHistory.length) {
		record.priceHistory = prices;
		changed = true;
	}

	if (!changed) return null;
	record.overallConfidence = computeOverallConfidence(
		record.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
	);
	record.lastUpdated = new Date().toISOString();
	return record;
}

/** Fold a retired key's record into the current key's record (sources by id, prices). */
export function mergeRecords(target: ScooterVerification, retired: ScooterVerification): ScooterVerification {
	const merged = structuredClone(target);
	for (const [field, fv] of Object.entries(retired.fields) as [SpecField, NonNullable<typeof retired.fields.range>][]) {
		const keep = fv.sources.filter((s) => !isCatalogSource(s) && !isLegacySeedSource(s));
		if (keep.length === 0) continue;
		const into = merged.fields[field] ?? { status: 'unverified' as const, sources: [], confidence: 0 };
		const ids = new Set(into.sources.map((s) => s.id));
		into.sources = [...into.sources, ...keep.filter((s) => !ids.has(s.id))];
		into.confidence = computeConfidence(into.sources);
		merged.fields[field] = into;
	}
	merged.priceHistory = dedupePrices([...merged.priceHistory, ...retired.priceHistory]);
	merged.overallConfidence = computeOverallConfidence(
		merged.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
	);
	merged.lastUpdated = new Date().toISOString();
	return merged;
}

export interface CatalogSyncResult {
	updated: string[];
	merged: Array<{ from: string; to: string }>;
	deleted: string[];
}

export async function syncCatalog(store: VerificationStore): Promise<CatalogSyncResult> {
	const all = await store.getAll();
	const result: CatalogSyncResult = { updated: [], merged: [], deleted: [] };

	// Retired keys first, so their sources land in the current record before it syncs.
	for (const [from, to] of Object.entries(presetAliases)) {
		const retired = all[from];
		if (!retired) continue;
		if (presets[to]) {
			all[to] = mergeRecords(all[to] ?? createEmptyVerification(to), retired);
			await store.set(to, all[to]);
		}
		await store.delete(from);
		delete all[from];
		result.merged.push({ from, to });
	}
	for (const key of removedPresetKeys) {
		if (!all[key]) continue;
		await store.delete(key);
		delete all[key];
		result.deleted.push(key);
	}

	const changed: ScooterVerification[] = [];
	for (const key of Object.keys(presetMetadata)) {
		if (key === 'custom' || !presets[key]) continue;
		const next = syncRecord(key, all[key] ?? null);
		if (!next) continue;
		changed.push(next);
		result.updated.push(key);
	}

	// A full resync touches every scooter; write in batches where the store can,
	// so a cold start stays well inside the serverless time limit.
	if (store.setMany) {
		for (let i = 0; i < changed.length; i += WRITE_BATCH) {
			await store.setMany(changed.slice(i, i + WRITE_BATCH));
		}
	} else {
		for (const record of changed) await store.set(record.scooterKey, record);
	}

	return result;
}
