import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { getStore } from '$lib/server/verification/store';
import {
	SPEC_FIELD_UNITS,
	type FieldVerification,
	type ScooterVerification,
	type SourceEntry,
	type SpecField,
} from '$lib/server/verification/types';
import { computeConfidence, computeOverallConfidence } from '$lib/server/verification/confidence';
import { presets } from '$lib/data/presets';
import { resolvePresetKey } from '$lib/data/preset-aliases';
import { logActivity } from '$lib/server/verification/activity-log';

const STATUSES = new Set(['unverified', 'verified', 'disputed', 'outdated']);
const SOURCE_TYPES = new Set(['manufacturer', 'retailer', 'review', 'community', 'scrape']);

function isValidSource(value: unknown): value is SourceEntry {
	if (!value || typeof value !== 'object') return false;
	const s = value as Record<string, unknown>;
	return (
		typeof s.id === 'string' &&
		typeof s.name === 'string' &&
		typeof s.type === 'string' &&
		SOURCE_TYPES.has(s.type) &&
		typeof s.value === 'number' &&
		Number.isFinite(s.value) &&
		typeof s.unit === 'string' &&
		typeof s.fetchedAt === 'string'
	);
}

/** Why a record can't be imported, or null when it is valid. */
function invalidReason(value: unknown): string | null {
	if (!value || typeof value !== 'object') return 'not an object';
	const v = value as Record<string, unknown>;
	if (!v.fields || typeof v.fields !== 'object') return 'missing fields';
	if (!Array.isArray(v.priceHistory)) return 'missing priceHistory';
	for (const [field, fv] of Object.entries(v.fields as Record<string, unknown>)) {
		if (!(field in SPEC_FIELD_UNITS)) return `unknown field "${field}"`;
		const f = fv as Record<string, unknown> | null;
		if (!f || typeof f.status !== 'string' || !STATUSES.has(f.status)) return `bad status on ${field}`;
		if (!Array.isArray(f.sources) || !f.sources.every(isValidSource)) return `bad sources on ${field}`;
	}
	for (const p of v.priceHistory as unknown[]) {
		const o = p as Record<string, unknown> | null;
		if (!o || typeof o.price !== 'number' || typeof o.source !== 'string' || typeof o.observedAt !== 'string') {
			return 'bad price observation';
		}
	}
	return null;
}

/** Merge an imported record into the stored one: sources by id (import wins), prices de-duplicated. */
function mergeImport(existing: ScooterVerification | null, incoming: ScooterVerification, key: string) {
	const merged: ScooterVerification = existing
		? structuredClone(existing)
		: { scooterKey: key, fields: {}, priceHistory: [], lastUpdated: '', overallConfidence: 0 };

	for (const [field, fv] of Object.entries(incoming.fields) as [SpecField, FieldVerification][]) {
		const current = merged.fields[field];
		const byId = new Map((current?.sources ?? []).map((src) => [src.id, src]));
		for (const src of fv.sources) byId.set(src.id, src);
		const sources = [...byId.values()];
		merged.fields[field] = {
			...current,
			...fv,
			sources,
			confidence: computeConfidence(sources),
		};
	}

	const seen = new Set(merged.priceHistory.map((p) => `${p.source}|${p.price}|${p.observedAt}`));
	for (const p of incoming.priceHistory) {
		const k = `${p.source}|${p.price}|${p.observedAt}`;
		if (!seen.has(k)) {
			seen.add(k);
			merged.priceHistory.push(p);
		}
	}

	merged.scooterKey = key;
	merged.lastUpdated = new Date().toISOString();
	merged.overallConfidence = computeOverallConfidence(
		merged.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
	);
	return merged;
}

export const GET: RequestHandler = async ({ cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const store = await getStore();
	const allData = await store.getAll();

	await logActivity('export', `Exported ${Object.keys(allData).length} scooter verifications`);

	return json({
		exportedAt: new Date().toISOString(),
		scooterCount: Object.keys(allData).length,
		data: allData,
	});
};

/** Import verification data */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json();
	if (!body.data || typeof body.data !== 'object') {
		throw error(400, 'Invalid import format. Expected { data: { ... } }');
	}

	const store = await getStore();
	let imported = 0;
	const skipped: Array<{ key: string; reason: string }> = [];

	for (const [rawKey, value] of Object.entries(body.data as Record<string, unknown>)) {
		const key = resolvePresetKey(rawKey);
		if (!presets[key] || key === 'custom') {
			skipped.push({ key: rawKey, reason: 'not in the catalog' });
			continue;
		}
		const reason = invalidReason(value);
		if (reason) {
			skipped.push({ key: rawKey, reason });
			continue;
		}
		await store.set(key, mergeImport(await store.get(key), value as ScooterVerification, key));
		imported++;
	}

	await logActivity('seed_completed', `Imported ${imported} scooter verifications from file`, {
		imported,
		skipped: skipped.length,
	});

	return json({ success: true, imported, skipped });
};
