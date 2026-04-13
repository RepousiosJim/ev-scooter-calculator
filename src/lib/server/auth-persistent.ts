/**
 * Persistent nonce revocation backed by Supabase.
 * Ensures destroyed sessions stay revoked across server restarts
 * and work correctly in multi-instance deployments.
 */
import { db } from './db';

export async function revokeNoncePersistent(nonce: string, expiry: number): Promise<void> {
	await db().from('revoked_nonces').upsert({ nonce, expiry }, { onConflict: 'nonce' });
}

export async function isNonceRevokedPersistent(nonce: string): Promise<boolean> {
	const { data } = await db().from('revoked_nonces').select('expiry').eq('nonce', nonce).single();

	if (!data) return false;
	if (data.expiry < Date.now()) {
		// Expired — clean it up and report not-revoked
		await db().from('revoked_nonces').delete().eq('nonce', nonce);
		return false;
	}
	return true;
}

/** Remove nonces whose expiry has passed. Call periodically. */
export async function cleanupRevokedNonces(): Promise<void> {
	await db().from('revoked_nonces').delete().lt('expiry', Date.now());
}
