/**
 * Auto-Fix Engine
 *
 * Automated data quality pipeline that can:
 * 1. Remove anomalous sources (values outside sane ranges)
 * 2. Sync every scooter with the catalog (presets.ts), replacing stale copies
 * 3. Auto-resolve conflicts (prefer manufacturer > retailer > review > community > scrape)
 * 4. Clean duplicate sources
 *
 * Can be triggered manually from admin UI or scheduled to run periodically.
 */

import type { SpecField, SourceEntry, SourceType } from './types';
import { getStore, removeSource } from './store';
import { syncCatalog } from './catalog-sync';
import { computeConfidence, computeOverallConfidence } from './confidence';
import { presetMetadata } from '$lib/data/presets';
import { logActivity } from './activity-log';

// ---------------------------------------------------------------------------
// Spec ranges (same as smart-alerts.ts — single source of truth)
// ---------------------------------------------------------------------------

export const SPEC_RANGES: Partial<Record<SpecField, { min: number; max: number; unit: string }>> = {
	topSpeed: { min: 15, max: 160, unit: 'km/h' },
	range: { min: 10, max: 250, unit: 'km' },
	batteryWh: { min: 150, max: 10000, unit: 'Wh' },
	price: { min: 100, max: 15000, unit: 'USD' },
	voltage: { min: 24, max: 120, unit: 'V' },
	motorWatts: { min: 200, max: 20000, unit: 'W' },
	weight: { min: 5, max: 80, unit: 'kg' },
	wheelSize: { min: 5, max: 16, unit: 'in' },
};

// Source type priority (higher = more trusted)
const SOURCE_PRIORITY: Record<SourceType, number> = {
	manufacturer: 5,
	retailer: 4,
	review: 3,
	community: 2,
	scrape: 1,
};

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AutoFixAction {
	type: 'remove_anomaly' | 'seed_from_preset' | 'resolve_conflict' | 'remove_duplicate';
	scooterKey: string;
	field?: string;
	description: string;
	details?: string;
}

export interface AutoFixResult {
	success: boolean;
	actions: AutoFixAction[];
	summary: {
		anomaliesFixed: number;
		scootersSeeded: number;
		fieldsSeeded: number;
		conflictsResolved: number;
		duplicatesRemoved: number;
		totalActions: number;
	};
	duration: number;
}

// ---------------------------------------------------------------------------
// Fix: Remove anomalous sources
// ---------------------------------------------------------------------------

async function fixAnomalies(): Promise<AutoFixAction[]> {
	const store = await getStore();
	const allData = await store.getAll();
	const actions: AutoFixAction[] = [];

	for (const [key, verification] of Object.entries(allData)) {
		for (const [field, fv] of Object.entries(verification.fields)) {
			const range = SPEC_RANGES[field as SpecField];
			if (!range || !fv || fv.sources.length === 0) continue;

			const badSources = fv.sources.filter((s) => s.value < range.min || s.value > range.max);
			const goodSources = fv.sources.filter((s) => s.value >= range.min && s.value <= range.max);

			// Only remove bad sources if there's at least one good source remaining,
			// OR if all sources are bad (remove them all to clear the anomaly)
			if (badSources.length > 0) {
				for (const bad of badSources) {
					await removeSource(store, key, field as SpecField, bad.id);
					actions.push({
						type: 'remove_anomaly',
						scooterKey: key,
						field,
						description: `Removed anomalous ${field} value ${bad.value} ${range.unit} from "${bad.name}"`,
						details: `Value outside range ${range.min}–${range.max} ${range.unit}. ${goodSources.length} good source(s) remain.`,
					});
				}
			}
		}
	}

	return actions;
}

// ---------------------------------------------------------------------------
// Fix: Sync the store with the catalog (see catalog-sync.ts)
// ---------------------------------------------------------------------------

async function seedFromPresets(): Promise<AutoFixAction[]> {
	const store = await getStore();
	const result = await syncCatalog(store);
	const actions: AutoFixAction[] = [];

	for (const key of result.updated) {
		actions.push({
			type: 'seed_from_preset',
			scooterKey: key,
			description: `Synced ${presetMetadata[key]?.name ?? key} with the catalog`,
		});
	}
	for (const { from, to } of result.merged) {
		actions.push({
			type: 'seed_from_preset',
			scooterKey: to,
			description: `Merged data stored under retired key "${from}" into ${to}`,
		});
	}
	for (const key of result.deleted) {
		actions.push({
			type: 'seed_from_preset',
			scooterKey: key,
			description: `Deleted data for "${key}", which was removed from the catalog`,
		});
	}

	return actions;
}

// ---------------------------------------------------------------------------
// Fix: Auto-resolve conflicts (set verifiedValue from highest-priority source)
// ---------------------------------------------------------------------------

async function resolveConflicts(): Promise<AutoFixAction[]> {
	const store = await getStore();
	const allData = await store.getAll();
	const actions: AutoFixAction[] = [];

	const CONFLICT_THRESHOLD_PERCENT = 15;

	for (const [key, verification] of Object.entries(allData)) {
		for (const [field, fv] of Object.entries(verification.fields)) {
			if (!fv || fv.sources.length < 2) continue;
			// Skip if already verified
			if (fv.status === 'verified' && fv.verifiedValue !== undefined) continue;

			const values = fv.sources.map((s) => s.value);
			const min = Math.min(...values);
			const max = Math.max(...values);
			const avg = values.reduce((a, b) => a + b, 0) / values.length;

			if (avg <= 0) continue;

			const spreadPercent = ((max - min) / avg) * 100;
			if (spreadPercent <= CONFLICT_THRESHOLD_PERCENT) continue;

			// Resolve by picking the highest-priority source type
			const sorted = [...fv.sources].sort((a, b) => (SOURCE_PRIORITY[b.type] || 0) - (SOURCE_PRIORITY[a.type] || 0));

			const bestSource = sorted[0];
			fv.verifiedValue = bestSource.value;
			fv.status = 'unverified'; // Don't auto-mark as verified, just set the preferred value
			fv.notes = `Auto-resolved: preferred ${bestSource.type} source "${bestSource.name}" (${bestSource.value})`;

			actions.push({
				type: 'resolve_conflict',
				scooterKey: key,
				field,
				description: `Resolved ${field} conflict for ${key}: preferred ${bestSource.type} value ${bestSource.value}`,
				details: `${fv.sources.length} sources, ${Math.round(spreadPercent)}% spread. Selected "${bestSource.name}" (${bestSource.type}).`,
			});
		}

		// Save updated verification
		verification.lastUpdated = new Date().toISOString();
		await store.set(key, verification);
	}

	return actions;
}

// ---------------------------------------------------------------------------
// Fix: Remove duplicate sources (same URL, same value)
// ---------------------------------------------------------------------------

async function removeDuplicates(): Promise<AutoFixAction[]> {
	const store = await getStore();
	const allData = await store.getAll();
	const actions: AutoFixAction[] = [];

	for (const [key, verification] of Object.entries(allData)) {
		let modified = false;

		for (const [field, fv] of Object.entries(verification.fields)) {
			if (!fv || fv.sources.length < 2) continue;

			const seen = new Map<string, string>(); // key → sourceId
			const toRemove: string[] = [];

			for (const s of fv.sources) {
				// Key: same name + same value (or same URL + same value)
				const dedupeKey = `${s.url || s.name}|${s.value}`;
				if (seen.has(dedupeKey)) {
					toRemove.push(s.id);
				} else {
					seen.set(dedupeKey, s.id);
				}
			}

			if (toRemove.length > 0) {
				fv.sources = fv.sources.filter((s) => !toRemove.includes(s.id));
				fv.confidence = computeConfidence(fv.sources);
				modified = true;

				actions.push({
					type: 'remove_duplicate',
					scooterKey: key,
					field,
					description: `Removed ${toRemove.length} duplicate source(s) from ${field} for ${key}`,
				});
			}
		}

		if (modified) {
			verification.lastUpdated = new Date().toISOString();
			verification.overallConfidence = computeOverallConfidence(
				verification.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
			);
			await store.set(key, verification);
		}
	}

	return actions;
}

// ---------------------------------------------------------------------------
// Main: Run all fixes
// ---------------------------------------------------------------------------

export type FixType = 'anomalies' | 'seed' | 'conflicts' | 'duplicates' | 'all';

export async function runAutoFix(fixTypes: FixType[] = ['all']): Promise<AutoFixResult> {
	const start = Date.now();
	const allActions: AutoFixAction[] = [];
	const runAll = fixTypes.includes('all');

	// Order matters: remove anomalies first, then seed, then resolve conflicts, then dedup
	if (runAll || fixTypes.includes('anomalies')) {
		const actions = await fixAnomalies();
		allActions.push(...actions);
	}

	if (runAll || fixTypes.includes('seed')) {
		const actions = await seedFromPresets();
		allActions.push(...actions);
	}

	if (runAll || fixTypes.includes('conflicts')) {
		const actions = await resolveConflicts();
		allActions.push(...actions);
	}

	if (runAll || fixTypes.includes('duplicates')) {
		const actions = await removeDuplicates();
		allActions.push(...actions);
	}

	const summary = {
		anomaliesFixed: allActions.filter((a) => a.type === 'remove_anomaly').length,
		scootersSeeded: new Set(allActions.filter((a) => a.type === 'seed_from_preset').map((a) => a.scooterKey)).size,
		fieldsSeeded: allActions.filter((a) => a.type === 'seed_from_preset').length,
		conflictsResolved: allActions.filter((a) => a.type === 'resolve_conflict').length,
		duplicatesRemoved: allActions.filter((a) => a.type === 'remove_duplicate').length,
		totalActions: allActions.length,
	};

	const duration = Date.now() - start;

	// Log the auto-fix run
	if (allActions.length > 0) {
		await logActivity('auto_fix_completed', `Auto-fix completed: ${summary.totalActions} action(s) in ${duration}ms`, {
			fixTypes: runAll ? ['all'] : fixTypes,
			...summary,
		});
	}

	return {
		success: true,
		actions: allActions,
		summary,
		duration,
	};
}
