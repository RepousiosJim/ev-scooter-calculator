import type { ScooterVerification } from './types';
import type { VerificationStore } from './store';
import { db, toJson } from '$lib/server/db';

export class SupabaseVerificationStore implements VerificationStore {
	async get(scooterKey: string): Promise<ScooterVerification | null> {
		const { data, error } = await db().from('scooter_verifications').select('*').eq('scooter_key', scooterKey).single();

		if (error || !data) return null;
		return rowToVerification(data);
	}

	async set(scooterKey: string, verification: ScooterVerification): Promise<void> {
		const { error } = await db()
			.from('scooter_verifications')
			.upsert(
				{
					scooter_key: scooterKey,
					fields: toJson(verification.fields),
					price_history: toJson(verification.priceHistory),
					last_updated: verification.lastUpdated,
					overall_confidence: verification.overallConfidence,
				},
				{ onConflict: 'scooter_key' }
			);

		if (error) throw new Error(`Supabase set error: ${error.message}`);
	}

	async getAll(): Promise<Record<string, ScooterVerification>> {
		const { data, error } = await db().from('scooter_verifications').select('*');

		if (error) throw new Error(`Supabase getAll error: ${error.message}`);
		const result: Record<string, ScooterVerification> = {};
		for (const row of data ?? []) {
			result[row.scooter_key] = rowToVerification(row);
		}
		return result;
	}
}

function rowToVerification(row: Record<string, unknown>): ScooterVerification {
	return {
		scooterKey: row.scooter_key as string,
		fields: (row.fields ?? {}) as ScooterVerification['fields'],
		priceHistory: (row.price_history ?? []) as ScooterVerification['priceHistory'],
		lastUpdated: row.last_updated as string,
		overallConfidence: row.overall_confidence as number,
	};
}
