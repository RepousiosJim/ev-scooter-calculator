import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getStore, updateFieldStatus } from '$lib/server/verification/store';
import type { SpecField, VerificationStatus } from '$lib/server/verification/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { scooterKey, field, status, verifiedValue } = body as {
		scooterKey: string;
		field: SpecField;
		status: VerificationStatus;
		verifiedValue?: number;
	};

	if (!scooterKey || !field || !status) {
		throw error(400, 'Missing required fields');
	}

	const validStatuses: VerificationStatus[] = ['unverified', 'verified', 'disputed', 'outdated'];
	if (!validStatuses.includes(status)) {
		throw error(400, 'Invalid status');
	}

	const store = await getStore();
	const updated = await updateFieldStatus(store, scooterKey, field, status, verifiedValue);
	return json({ success: true, verification: updated });
};
