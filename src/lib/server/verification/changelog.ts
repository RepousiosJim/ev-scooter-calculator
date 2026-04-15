/**
 * Changelog / Diff System
 *
 * Tracks what changed between scans by comparing verification snapshots.
 * Stores a history of changes for each scooter field.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ScooterVerification, SpecField } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const CHANGELOG_FILE = join(DATA_DIR, 'changelog.json');
const MAX_ENTRIES = 1000;

export type ChangeType = 'value_changed' | 'source_added' | 'source_removed' | 'price_changed' | 'status_changed';

export interface ChangeEntry {
	id: string;
	timestamp: string;
	scooterKey: string;
	scooterName: string;
	changeType: ChangeType;
	field?: string;
	oldValue?: number | string;
	newValue?: number | string;
	source?: string;
	details?: string;
}

let cache: ChangeEntry[] | null = null;

async function loadChangelog(): Promise<ChangeEntry[]> {
	if (cache) return cache;
	try {
		if (existsSync(CHANGELOG_FILE)) {
			const raw = await readFile(CHANGELOG_FILE, 'utf-8');
			cache = JSON.parse(raw);
			return cache!;
		}
	} catch {
		/* start fresh */
	}
	cache = [];
	return cache;
}

async function saveChangelog(): Promise<void> {
	// Vercel filesystem is read-only — skip file persistence; in-memory cache remains for lambda lifetime
	if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
		return;
	}
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(CHANGELOG_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function makeId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Compare before & after verification states and record diffs.
 */
export async function recordChanges(
	scooterKey: string,
	scooterName: string,
	before: ScooterVerification | null,
	after: ScooterVerification
): Promise<ChangeEntry[]> {
	const entries = await loadChangelog();
	const newChanges: ChangeEntry[] = [];
	const now = new Date().toISOString();

	const allFields = new Set<string>([...Object.keys(before?.fields || {}), ...Object.keys(after.fields || {})]);

	for (const field of allFields) {
		const oldField = before?.fields?.[field as SpecField];
		const newField = after.fields?.[field as SpecField];

		// Source count changed
		const oldSourceCount = oldField?.sources?.length || 0;
		const newSourceCount = newField?.sources?.length || 0;

		if (newSourceCount > oldSourceCount) {
			const addedSources = newField!.sources.slice(oldSourceCount);
			for (const src of addedSources) {
				newChanges.push({
					id: makeId(),
					timestamp: now,
					scooterKey,
					scooterName,
					changeType: 'source_added',
					field,
					newValue: src.value,
					source: src.name,
					details: `${src.name} reports ${src.value} ${src.unit}`,
				});
			}
		} else if (newSourceCount < oldSourceCount) {
			newChanges.push({
				id: makeId(),
				timestamp: now,
				scooterKey,
				scooterName,
				changeType: 'source_removed',
				field,
				details: `${oldSourceCount - newSourceCount} source(s) removed`,
			});
		}

		// Verified value changed
		if (oldField?.verifiedValue !== undefined && newField?.verifiedValue !== undefined) {
			if (oldField.verifiedValue !== newField.verifiedValue) {
				newChanges.push({
					id: makeId(),
					timestamp: now,
					scooterKey,
					scooterName,
					changeType: 'value_changed',
					field,
					oldValue: oldField.verifiedValue,
					newValue: newField.verifiedValue,
					details: `Verified value changed from ${oldField.verifiedValue} to ${newField.verifiedValue}`,
				});
			}
		}

		// Status changed
		if (oldField?.status && newField?.status && oldField.status !== newField.status) {
			newChanges.push({
				id: makeId(),
				timestamp: now,
				scooterKey,
				scooterName,
				changeType: 'status_changed',
				field,
				oldValue: oldField.status,
				newValue: newField.status,
				details: `Status changed from ${oldField.status} to ${newField.status}`,
			});
		}
	}

	// Price changes
	const oldPriceCount = before?.priceHistory?.length || 0;
	const newPriceCount = after.priceHistory?.length || 0;

	if (newPriceCount > oldPriceCount) {
		const latestPrice = after.priceHistory[0];
		const prevPrice = oldPriceCount > 0 ? before!.priceHistory[0] : null;

		if (prevPrice && latestPrice.price !== prevPrice.price) {
			newChanges.push({
				id: makeId(),
				timestamp: now,
				scooterKey,
				scooterName,
				changeType: 'price_changed',
				field: 'price',
				oldValue: prevPrice.price,
				newValue: latestPrice.price,
				source: latestPrice.source,
				details: `$${prevPrice.price.toLocaleString()} → $${latestPrice.price.toLocaleString()}`,
			});
		}
	}

	// Persist
	if (newChanges.length > 0) {
		entries.unshift(...newChanges);
		if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
		cache = entries;
		await saveChangelog();
	}

	return newChanges;
}

/**
 * Get recent changelog entries.
 */
export async function getChangelog(
	limit = 50,
	offset = 0,
	scooterKey?: string
): Promise<{ entries: ChangeEntry[]; total: number }> {
	const all = await loadChangelog();
	const filtered = scooterKey ? all.filter((e) => e.scooterKey === scooterKey) : all;
	return {
		entries: filtered.slice(offset, offset + limit),
		total: filtered.length,
	};
}
