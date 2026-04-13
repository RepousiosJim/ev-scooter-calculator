import { env } from '$env/dynamic/private';
import { timingSafeEqual, randomBytes, createHmac } from 'crypto';
import { isSupabaseAvailable } from './db';
import { revokeNoncePersistent, isNonceRevokedPersistent } from './auth-persistent';

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Dev-only: generate a cryptographically random secret once per process.
// Restarting the server invalidates all dev sessions, which is acceptable.
const DEV_GENERATED_SECRET = randomBytes(32).toString('hex');

function getSecret(): string {
	if (env.SESSION_SECRET) return env.SESSION_SECRET;

	// In production, require a dedicated secret.
	if (env.NODE_ENV === 'production') {
		throw new Error('SESSION_SECRET must be set in production');
	}

	// Dev fallback: use a random secret (not the password) so session tokens
	// are still cryptographically opaque even in development.
	console.warn(
		'[auth] SESSION_SECRET not set — using a random per-process secret for dev. Set SESSION_SECRET in .env to persist sessions across restarts.'
	);
	return DEV_GENERATED_SECRET;
}

// ---------------------------------------------------------------------------
// Session revocation — in-memory nonce blacklist
// ---------------------------------------------------------------------------
// Map of nonce -> expiry timestamp. Entries are cleaned up lazily on access.
const revokedNonces = new Map<string, number>();

function revokeNonce(nonce: string, expiry: number): void {
	revokedNonces.set(nonce, expiry);
	// Also persist to Supabase if available (fire-and-forget)
	if (isSupabaseAvailable()) {
		revokeNoncePersistent(nonce, expiry).catch(() => {});
	}
	// Lazy cleanup: remove nonces that have already expired
	const now = Date.now();
	for (const [n, exp] of revokedNonces) {
		if (exp < now) revokedNonces.delete(n);
	}
}

async function isNonceRevoked(nonce: string): Promise<boolean> {
	// Check in-memory first (fast path)
	const expiry = revokedNonces.get(nonce);
	if (expiry !== undefined) {
		if (expiry < Date.now()) {
			revokedNonces.delete(nonce);
			return false;
		}
		return true;
	}
	// Fall back to Supabase if available
	if (isSupabaseAvailable()) {
		return isNonceRevokedPersistent(nonce).catch(() => false);
	}
	return false;
}

export function validatePassword(input: string): boolean {
	const expected = env.ADMIN_PASSWORD;
	if (!expected || !input) return false;

	const inputBuf = Buffer.from(input.padEnd(256, '\0'));
	const expectedBuf = Buffer.from(expected.padEnd(256, '\0'));

	return inputBuf.length === expectedBuf.length && timingSafeEqual(inputBuf, expectedBuf);
}

/**
 * Create a signed session token.
 * Format: base64(payload).base64(hmac-sha256(payload))
 * Payload: JSON { exp: timestamp, nonce: random }
 * No server-side state required — works across serverless instances.
 */
export function createSession(): string {
	const payload = JSON.stringify({
		exp: Date.now() + SESSION_TTL,
		nonce: randomBytes(16).toString('hex'),
	});

	const payloadB64 = Buffer.from(payload).toString('base64url');
	const sig = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');

	return `${payloadB64}.${sig}`;
}

export async function validateSession(token: string | undefined): Promise<boolean> {
	if (!token) return false;

	const dotIndex = token.indexOf('.');
	if (dotIndex === -1) return false;

	const payloadB64 = token.slice(0, dotIndex);
	const sig = token.slice(dotIndex + 1);

	// Verify signature
	const expectedSig = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
	const sigBuf = Buffer.from(sig);
	const expectedBuf = Buffer.from(expectedSig);

	if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
		return false;
	}

	// Verify expiry and revocation
	try {
		const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
		if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
			return false;
		}
		if (typeof payload.nonce === 'string' && (await isNonceRevoked(payload.nonce))) {
			return false;
		}
	} catch {
		return false;
	}

	return true;
}

export function destroySession(token: string): void {
	// Add the token's nonce to the revocation list so it cannot be reused
	// within its original TTL window, even if the cookie is retained by an attacker.
	try {
		const dotIndex = token.indexOf('.');
		if (dotIndex === -1) return;
		const payload = JSON.parse(Buffer.from(token.slice(0, dotIndex), 'base64url').toString());
		if (typeof payload.nonce === 'string' && typeof payload.exp === 'number') {
			revokeNonce(payload.nonce, payload.exp);
		}
	} catch {
		// Malformed token — nothing to revoke
	}
}
