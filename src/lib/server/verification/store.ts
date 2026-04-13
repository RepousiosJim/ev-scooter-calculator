import type { ScooterVerification, SpecField, SourceEntry, VerificationStatus, PriceObservation } from './types';
import { computeConfidence, computeOverallConfidence } from './confidence';

export interface VerificationStore {
	get(scooterKey: string): Promise<ScooterVerification | null>;
	set(scooterKey: string, data: ScooterVerification): Promise<void>;
	getAll(): Promise<Record<string, ScooterVerification>>;
}

function createEmptyVerification(scooterKey: string): ScooterVerification {
	return {
		scooterKey,
		fields: {},
		priceHistory: [],
		lastUpdated: new Date().toISOString(),
		overallConfidence: 0,
	};
}

type FieldVerification = NonNullable<ScooterVerification['fields'][string]>;

/** Upsert a source into a field's source list and recompute its confidence. */
function upsertSourceInField(field: FieldVerification, source: SourceEntry): void {
	const idx = field.sources.findIndex((s) => s.url && s.url === source.url);
	if (idx !== -1) {
		field.sources[idx] = source;
	} else {
		field.sources.push(source);
	}
	field.confidence = computeConfidence(field.sources);
}

/** High-level operations built on top of any store implementation */
export async function addSource(
	store: VerificationStore,
	scooterKey: string,
	field: SpecField,
	source: SourceEntry
): Promise<ScooterVerification> {
	const data = (await store.get(scooterKey)) || createEmptyVerification(scooterKey);

	if (!data.fields[field]) {
		data.fields[field] = { status: 'unverified', sources: [], confidence: 0 };
	}

	upsertSourceInField(data.fields[field]!, source);
	data.lastUpdated = new Date().toISOString();
	data.overallConfidence = computeOverallConfidence(
		data.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
	);

	await store.set(scooterKey, data);
	return data;
}

/**
 * Apply multiple (field, source) pairs to a scooter record in a single get/set cycle.
 * Use instead of calling addSource in a loop to reduce DB/file round-trips to one.
 */
export async function batchAddSources(
	store: VerificationStore,
	scooterKey: string,
	entries: Array<{ field: SpecField; source: SourceEntry }>
): Promise<ScooterVerification> {
	const data = (await store.get(scooterKey)) || createEmptyVerification(scooterKey);

	for (const { field, source } of entries) {
		if (!data.fields[field]) {
			data.fields[field] = { status: 'unverified', sources: [], confidence: 0 };
		}
		upsertSourceInField(data.fields[field]!, source);
	}

	data.lastUpdated = new Date().toISOString();
	data.overallConfidence = computeOverallConfidence(
		data.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
	);

	await store.set(scooterKey, data);
	return data;
}

export async function removeSource(
	store: VerificationStore,
	scooterKey: string,
	field: SpecField,
	sourceId: string
): Promise<ScooterVerification | null> {
	const data = await store.get(scooterKey);
	if (!data || !data.fields[field]) return data;

	data.fields[field]!.sources = data.fields[field]!.sources.filter((s) => s.id !== sourceId);
	data.fields[field]!.confidence = computeConfidence(data.fields[field]!.sources);

	if (data.fields[field]!.sources.length === 0) {
		data.fields[field]!.status = 'unverified';
		data.fields[field]!.verifiedValue = undefined;
	}

	data.lastUpdated = new Date().toISOString();
	data.overallConfidence = computeOverallConfidence(
		data.fields as Record<string, { confidence: number; sources: SourceEntry[] }>
	);

	await store.set(scooterKey, data);
	return data;
}

export async function updateFieldStatus(
	store: VerificationStore,
	scooterKey: string,
	field: SpecField,
	status: VerificationStatus,
	verifiedValue?: number
): Promise<ScooterVerification | null> {
	const data = await store.get(scooterKey);
	if (!data) return null;

	if (!data.fields[field]) {
		data.fields[field] = {
			status,
			sources: [],
			confidence: 0,
		};
	}

	data.fields[field]!.status = status;
	if (verifiedValue !== undefined) {
		data.fields[field]!.verifiedValue = verifiedValue;
	}
	if (status === 'verified') {
		data.fields[field]!.lastVerified = new Date().toISOString();
	}

	data.lastUpdated = new Date().toISOString();
	await store.set(scooterKey, data);
	return data;
}

export async function addPriceObservation(
	store: VerificationStore,
	scooterKey: string,
	observation: PriceObservation
): Promise<ScooterVerification> {
	const data = (await store.get(scooterKey)) || createEmptyVerification(scooterKey);
	data.priceHistory.push(observation);
	data.priceHistory.sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
	data.lastUpdated = new Date().toISOString();
	await store.set(scooterKey, data);
	return data;
}

let storeInstance: VerificationStore | null = null;

export async function getStore(): Promise<VerificationStore> {
	if (storeInstance) return storeInstance;

	const { isSupabaseAvailable } = await import('$lib/server/db');
	if (isSupabaseAvailable()) {
		const { SupabaseVerificationStore } = await import('./store-supabase');
		storeInstance = new SupabaseVerificationStore();
	} else {
		const { LocalVerificationStore } = await import('./store-local');
		storeInstance = new LocalVerificationStore();
	}
	return storeInstance;
}
