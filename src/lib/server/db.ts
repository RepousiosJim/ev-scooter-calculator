import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';

/**
 * Safely serialize any domain object to Supabase's Json type.
 * Use this instead of `as never` / `as unknown` when inserting rich types into JSONB columns.
 */
export function toJson<T>(value: T): Json {
	return JSON.parse(JSON.stringify(value)) as Json;
}

// Resolved once at module load — avoids re-importing env on every request
let _client: ReturnType<typeof createClient<Database>> | null = null;
let _available: boolean | null = null;

/** Returns true when Supabase env vars are configured. Cached after first call. */
export function isSupabaseAvailable(): boolean {
	if (_available !== null) return _available;
	try {
		// Dynamic import of SvelteKit private env isn't available at module init time,
		// so we check process.env as a universal fallback (Vite exposes them via .env).
		const url = process.env.SUPABASE_URL;
		const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
		_available = !!(url && key);
	} catch {
		_available = false;
	}
	return _available;
}

/** Typed Supabase client singleton. Throws if env vars are not set. */
export function db(): ReturnType<typeof createClient<Database>> {
	if (_client) return _client;

	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
	}

	_client = createClient<Database>(url, key, {
		auth: { persistSession: false },
	});
	return _client;
}
