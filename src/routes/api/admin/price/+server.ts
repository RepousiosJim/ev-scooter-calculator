import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin-guard';
import { getStore, addPriceObservation } from '$lib/server/verification/store';
import type { PriceObservation } from '$lib/server/verification/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	await requireAdmin({ cookies });

	const body = await request.json();
	const { scooterKey, observation } = body as {
		scooterKey: string;
		observation: Omit<PriceObservation, 'observedAt'> & { observedAt?: string };
	};

	if (!scooterKey || !observation?.price || !observation?.source) {
		throw error(400, 'Missing required fields');
	}

	const store = await getStore();
	const priceObs: PriceObservation = {
		...observation,
		observedAt: observation.observedAt || new Date().toISOString(),
	};

	const updated = await addPriceObservation(store, scooterKey, priceObs);
	return json({ success: true, verification: updated });
};
