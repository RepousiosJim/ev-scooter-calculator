import { env } from '$env/dynamic/private';
import { timingSafeEqual, randomBytes } from 'crypto';

const sessions = new Map<string, number>(); // token -> expiry timestamp

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function validatePassword(input: string): boolean {
	const expected = env.ADMIN_PASSWORD;
	if (!expected || !input) return false;

	const inputBuf = Buffer.from(input.padEnd(256, '\0'));
	const expectedBuf = Buffer.from(expected.padEnd(256, '\0'));

	return inputBuf.length === expectedBuf.length && timingSafeEqual(inputBuf, expectedBuf);
}

export function createSession(): string {
	// Clean up expired sessions
	const now = Date.now();
	for (const [token, expiry] of sessions) {
		if (expiry < now) sessions.delete(token);
	}

	const token = randomBytes(32).toString('hex');
	sessions.set(token, now + SESSION_TTL);
	return token;
}

export function validateSession(token: string | undefined): boolean {
	if (!token) return false;
	const expiry = sessions.get(token);
	if (!expiry) return false;
	if (expiry < Date.now()) {
		sessions.delete(token);
		return false;
	}
	return true;
}

export function destroySession(token: string): void {
	sessions.delete(token);
}
