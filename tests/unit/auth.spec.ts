import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		ADMIN_PASSWORD: 'test-password-123',
		SESSION_SECRET: 'test-secret-key-for-hmac',
	},
}));

import { validatePassword, createSession, validateSession, destroySession } from '$lib/server/auth';

import { requireAdmin, rateLimit } from '$lib/server/admin-guard';

// ---------------------------------------------------------------------------
// Auth module
// ---------------------------------------------------------------------------
describe('Auth – validatePassword', () => {
	it('returns true for the correct password', () => {
		expect(validatePassword('test-password-123')).toBe(true);
	});

	it('returns false for an incorrect password', () => {
		expect(validatePassword('wrong-password')).toBe(false);
	});

	it('returns false for an empty input string', () => {
		expect(validatePassword('')).toBe(false);
	});

	it('returns false when ADMIN_PASSWORD env is empty', async () => {
		const envModule = await import('$env/dynamic/private');
		const original = envModule.env.ADMIN_PASSWORD;
		(envModule.env as Record<string, string>).ADMIN_PASSWORD = '';
		try {
			expect(validatePassword('test-password-123')).toBe(false);
		} finally {
			(envModule.env as Record<string, string>).ADMIN_PASSWORD = original!;
		}
	});
});

describe('Auth – createSession', () => {
	it('returns a string containing a dot separator', () => {
		const token = createSession();
		expect(typeof token).toBe('string');
		expect(token).toContain('.');
	});

	it('has two non-empty base64url parts', () => {
		const token = createSession();
		const parts = token.split('.');
		expect(parts).toHaveLength(2);
		expect(parts[0].length).toBeGreaterThan(0);
		expect(parts[1].length).toBeGreaterThan(0);
	});

	it('payload decodes to JSON with exp and nonce fields', () => {
		const token = createSession();
		const payloadB64 = token.split('.')[0];
		const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
		expect(typeof payload.exp).toBe('number');
		expect(typeof payload.nonce).toBe('string');
		expect(payload.exp).toBeGreaterThan(Date.now());
	});

	it('produces unique tokens on successive calls', () => {
		const a = createSession();
		const b = createSession();
		expect(a).not.toBe(b);
	});
});

describe('Auth – validateSession', () => {
	it('accepts a freshly created token', async () => {
		const token = createSession();
		expect(await validateSession(token)).toBe(true);
	});

	it('rejects undefined', async () => {
		expect(await validateSession(undefined)).toBe(false);
	});

	it('rejects an empty string', async () => {
		expect(await validateSession('')).toBe(false);
	});

	it('rejects a token without a dot', async () => {
		expect(await validateSession('nodothere')).toBe(false);
	});

	it('rejects a token with a tampered payload', async () => {
		const token = createSession();
		const [payloadB64, sig] = token.split('.');
		// Flip one character in the payload
		const tampered = payloadB64.slice(0, -1) + (payloadB64.slice(-1) === 'A' ? 'B' : 'A');
		expect(await validateSession(`${tampered}.${sig}`)).toBe(false);
	});

	it('rejects a token with a tampered signature', async () => {
		const token = createSession();
		const [payloadB64, sig] = token.split('.');
		const tampered = sig.slice(0, -1) + (sig.slice(-1) === 'A' ? 'B' : 'A');
		expect(await validateSession(`${payloadB64}.${tampered}`)).toBe(false);
	});

	it('rejects an expired token', async () => {
		// Manually craft an expired payload and sign it
		const { createHmac } = require('crypto');
		const payload = JSON.stringify({ exp: Date.now() - 1000, nonce: 'abc' });
		const payloadB64 = Buffer.from(payload).toString('base64url');
		const sig = createHmac('sha256', 'test-secret-key-for-hmac').update(payloadB64).digest('base64url');
		expect(await validateSession(`${payloadB64}.${sig}`)).toBe(false);
	});

	it('rejects a completely malformed token', async () => {
		expect(await validateSession('!!!.!!!')).toBe(false);
	});
});

describe('Auth – destroySession', () => {
	it('does not throw', () => {
		expect(() => destroySession('any-token')).not.toThrow();
	});

	it('does not throw when given a malformed token (no dot)', () => {
		expect(() => destroySession('nodothere')).not.toThrow();
	});

	it('does not throw when given an empty string', () => {
		expect(() => destroySession('')).not.toThrow();
	});

	it('revoked token is rejected by validateSession', async () => {
		const token = createSession();
		// Validate before revocation — must pass
		expect(await validateSession(token)).toBe(true);

		// Revoke it
		destroySession(token);

		// Must now be rejected
		expect(await validateSession(token)).toBe(false);
	});

	it('revoking one token does not invalidate a different session', async () => {
		const tokenA = createSession();
		const tokenB = createSession();

		destroySession(tokenA);

		expect(await validateSession(tokenA)).toBe(false);
		expect(await validateSession(tokenB)).toBe(true);
	});

	it('double-revoking the same token is safe and keeps it invalid', async () => {
		const token = createSession();
		destroySession(token);
		expect(() => destroySession(token)).not.toThrow();
		expect(await validateSession(token)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Admin Guard module
// ---------------------------------------------------------------------------
describe('Admin Guard – requireAdmin', () => {
	it('throws 401 when there is no session cookie', async () => {
		const event = {
			cookies: { get: (_name: string) => undefined },
		};
		try {
			await requireAdmin(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(401);
		}
	});

	it('throws 401 when the session cookie is invalid', async () => {
		const event = {
			cookies: { get: (_name: string) => 'bad-token' },
		};
		try {
			await requireAdmin(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(401);
		}
	});

	it('does not throw when the session cookie is valid', async () => {
		const token = createSession();
		const event = {
			cookies: { get: (name: string) => (name === 'admin_session' ? token : undefined) },
		};
		await expect(requireAdmin(event as any)).resolves.toBeUndefined();
	});
});

describe('Admin Guard – rateLimit', () => {
	beforeEach(() => {
		// Reset the internal rate-limit map by advancing time past the window.
		// The module uses Date.now() internally, so we use fake timers.
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('allows requests under the limit', async () => {
		const event = { getClientAddress: () => '192.168.1.1' };
		// 60 requests should be fine (limit is >60)
		for (let i = 0; i < 60; i++) {
			await rateLimit(event as any);
		}
	});

	it('throws 429 when over the limit', async () => {
		const event = { getClientAddress: () => '10.0.0.99' };
		// Fire 60 allowed requests
		for (let i = 0; i < 60; i++) {
			await rateLimit(event as any);
		}
		// The 61st should be rejected
		try {
			await rateLimit(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(429);
		}
	});

	it('resets the counter after the time window elapses', async () => {
		const event = { getClientAddress: () => '10.0.0.50' };
		// Exhaust the limit
		for (let i = 0; i < 60; i++) {
			await rateLimit(event as any);
		}
		// Advance past the 60-second window
		vi.advanceTimersByTime(61_000);
		// Should be allowed again
		await rateLimit(event as any);
	});
});
