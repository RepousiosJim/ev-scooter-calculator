import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { EMAIL_RE } from '$lib/utils/formatters';
import { isSupabaseAvailable, db } from '$lib/server/db';

const DATA_DIR = join(process.cwd(), 'data');
const SUBSCRIBERS_FILE = join(DATA_DIR, 'newsletter-subscribers.json');

export type NotificationPreference = 'price_alerts' | 'new_models' | 'guides';

export interface Subscriber {
	email: string;
	preferences: NotificationPreference[];
	subscribedAt: string;
	updatedAt: string;
}

// --- File-based fallback ---

interface SubscribersFile {
	subscribers: Record<string, Subscriber>;
}

async function loadSubscribers(): Promise<SubscribersFile> {
	try {
		const raw = await readFile(SUBSCRIBERS_FILE, 'utf-8');
		return JSON.parse(raw) as SubscribersFile;
	} catch (e) {
		// File not existing on first run is expected; log anything else
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
			console.warn('[newsletter] Failed to load subscribers file:', e);
		}
	}
	return { subscribers: {} };
}

async function saveSubscribers(data: SubscribersFile): Promise<void> {
	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// In-process mutex for file-based writes (matches AsyncMutex pattern used elsewhere)
let writeLock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
	const prev = writeLock;
	let resolve!: () => void;
	writeLock = new Promise<void>((r) => {
		resolve = r;
	});
	return prev.then(fn).finally(() => resolve());
}

// ---------------------------------------------------------------------------
// POST /api/newsletter — subscribe or update preferences
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; preferences?: string[] };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { email, preferences = [] } = body;

	if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
		return json({ error: 'Invalid email address' }, { status: 400 });
	}

	const cleanEmail = email.trim().toLowerCase();
	const cleanPrefs = (preferences as string[]).filter((p): p is NotificationPreference =>
		['price_alerts', 'new_models', 'guides'].includes(p)
	);
	const now = new Date().toISOString();

	if (isSupabaseAvailable()) {
		const { data: existing } = await db()
			.from('newsletter_subscribers')
			.select('preferences, subscribed_at')
			.eq('email', cleanEmail)
			.single();

		const { error } = await db()
			.from('newsletter_subscribers')
			.upsert(
				{
					email: cleanEmail,
					preferences: cleanPrefs.length > 0 ? cleanPrefs : (existing?.preferences ?? ['new_models']),
					subscribed_at: existing?.subscribed_at ?? now,
					updated_at: now,
				},
				{ onConflict: 'email' }
			);

		if (error) {
			console.error('[newsletter] Supabase subscribe error:', error);
			return json({ error: 'Failed to subscribe' }, { status: 500 });
		}
		return json({ success: true, message: "You're subscribed!" });
	}

	const result = await withLock(async () => {
		const data = await loadSubscribers();
		const ex = data.subscribers[cleanEmail];
		data.subscribers[cleanEmail] = {
			email: cleanEmail,
			preferences: cleanPrefs.length > 0 ? cleanPrefs : (ex?.preferences ?? ['new_models']),
			subscribedAt: ex?.subscribedAt ?? now,
			updatedAt: now,
		};
		await saveSubscribers(data);
		return { success: true, message: "You're subscribed!" };
	});

	return json(result);
};

// ---------------------------------------------------------------------------
// DELETE /api/newsletter — unsubscribe
// ---------------------------------------------------------------------------

export const DELETE: RequestHandler = async ({ request }) => {
	let body: { email?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { email } = body;

	if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
		return json({ error: 'Invalid email address' }, { status: 400 });
	}

	const cleanEmail = email.trim().toLowerCase();

	if (isSupabaseAvailable()) {
		const { error, count } = await db().from('newsletter_subscribers').delete().eq('email', cleanEmail);

		if (error) {
			console.error('[newsletter] Supabase unsubscribe error:', error);
			return json({ error: 'Failed to unsubscribe' }, { status: 500 });
		}
		if (!count) return json({ error: 'Subscription not found' }, { status: 404 });
		return json({ success: true, message: 'You have been unsubscribed.' });
	}

	const result = await withLock(async () => {
		const data = await loadSubscribers();
		if (!data.subscribers[cleanEmail]) return null;
		delete data.subscribers[cleanEmail];
		await saveSubscribers(data);
		return { success: true, message: 'You have been unsubscribed.' };
	});

	if (!result) return json({ error: 'Subscription not found' }, { status: 404 });
	return json(result);
};
