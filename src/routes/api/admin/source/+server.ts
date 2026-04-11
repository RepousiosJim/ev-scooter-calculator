import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getStore, addSource, removeSource } from '$lib/server/verification/store';
import type { SpecField, SourceType } from '$lib/server/verification/types';
import { randomBytes } from 'crypto';
import { logActivity } from '$lib/server/verification/activity-log';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { scooterKey, field, source } = body as {
		scooterKey: string;
		field: SpecField;
		source: {
			type: SourceType;
			name: string;
			url?: string;
			value: number;
			unit: string;
			addedBy?: 'manual' | 'scraper';
			notes?: string;
		};
	};

	if (!scooterKey || !field || !source?.name || source?.value === undefined) {
		throw error(400, 'Missing required fields');
	}

	const store = await getStore();
	const sourceEntry = {
		id: randomBytes(8).toString('hex'),
		type: source.type,
		name: source.name,
		url: source.url,
		value: source.value,
		unit: source.unit,
		fetchedAt: new Date().toISOString(),
		addedBy: (source.addedBy || 'manual') as 'manual' | 'scraper',
		notes: source.notes
	};

	const updated = await addSource(store, scooterKey, field, sourceEntry);
	await logActivity('source_added', `Added ${source.type} source for ${scooterKey}.${field}: ${source.value} ${source.unit}`, {
		scooterKey, field, sourceName: source.name, value: source.value,
	});
	return json({ success: true, verification: updated });
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { scooterKey, field, sourceId } = body as {
		scooterKey: string;
		field: SpecField;
		sourceId: string;
	};

	if (!scooterKey || !field || !sourceId) {
		throw error(400, 'Missing required fields');
	}

	const store = await getStore();
	const updated = await removeSource(store, scooterKey, field, sourceId);
	await logActivity('source_removed', `Removed source ${sourceId} from ${scooterKey}.${field}`, {
		scooterKey, field, sourceId,
	});
	return json({ success: true, verification: updated });
};
