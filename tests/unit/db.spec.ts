/**
 * Unit tests for src/lib/server/db.ts
 *
 * The Supabase client creation is mocked so no real network calls occur.
 * We focus on the three exported functions: toJson, isSupabaseAvailable, and db().
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js at top level (required for hoisting)
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn().mockReturnValue({ auth: {}, from: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// toJson — import directly (no env dependency)
// ---------------------------------------------------------------------------

import { toJson } from '$lib/server/db';

describe('toJson', () => {
	it('serialises a plain object', () => {
		const result = toJson({ a: 1, b: 'hello' });
		expect(result).toEqual({ a: 1, b: 'hello' });
	});

	it('serialises an array', () => {
		const result = toJson([1, 2, 3]);
		expect(result).toEqual([1, 2, 3]);
	});

	it('serialises nested objects', () => {
		const input = { outer: { inner: { deep: true } } };
		const result = toJson(input);
		expect(result).toEqual(input);
	});

	it('returns a value equal in structure but not the same reference', () => {
		const input = { x: 1 };
		const result = toJson(input);
		expect(result).toEqual(input);
		expect(result).not.toBe(input);
	});

	it('strips undefined values (JSON serialisation behaviour)', () => {
		const input = { a: 1, b: undefined };
		const result = toJson(input) as Record<string, unknown>;
		expect(result.a).toBe(1);
		expect('b' in result).toBe(false);
	});

	it('handles null', () => {
		expect(toJson(null)).toBeNull();
	});

	it('handles a number', () => {
		expect(toJson(42)).toBe(42);
	});

	it('handles a string', () => {
		expect(toJson('hello')).toBe('hello');
	});
});

// ---------------------------------------------------------------------------
// isSupabaseAvailable and db() — use module resets to control the cached state
// ---------------------------------------------------------------------------

afterEach(() => {
	vi.resetModules();
	delete process.env.SUPABASE_URL;
	delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe('isSupabaseAvailable', () => {
	it('returns false when env vars are not set', async () => {
		vi.resetModules();
		delete process.env.SUPABASE_URL;
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
		const { isSupabaseAvailable } = await import('$lib/server/db');
		expect(isSupabaseAvailable()).toBe(false);
	});

	it('returns true when both env vars are set', async () => {
		vi.resetModules();
		process.env.SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
		const { isSupabaseAvailable } = await import('$lib/server/db');
		expect(isSupabaseAvailable()).toBe(true);
	});

	it('returns false when only SUPABASE_URL is set', async () => {
		vi.resetModules();
		process.env.SUPABASE_URL = 'https://test.supabase.co';
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
		const { isSupabaseAvailable } = await import('$lib/server/db');
		expect(isSupabaseAvailable()).toBe(false);
	});

	it('returns false when only SUPABASE_SERVICE_ROLE_KEY is set', async () => {
		vi.resetModules();
		delete process.env.SUPABASE_URL;
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'some-key';
		const { isSupabaseAvailable } = await import('$lib/server/db');
		expect(isSupabaseAvailable()).toBe(false);
	});
});

describe('db()', () => {
	it('throws when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set', async () => {
		vi.resetModules();
		delete process.env.SUPABASE_URL;
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
		const { db } = await import('$lib/server/db');
		expect(() => db()).toThrow();
	});

	it('returns a client when env vars are set', async () => {
		vi.resetModules();
		process.env.SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		const { db } = await import('$lib/server/db');
		const client = db();
		expect(client).toBeDefined();
	});

	it('returns the same singleton on repeated calls', async () => {
		vi.resetModules();
		process.env.SUPABASE_URL = 'https://test.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		const { db } = await import('$lib/server/db');
		const c1 = db();
		const c2 = db();
		expect(c1).toBe(c2);
	});
});
