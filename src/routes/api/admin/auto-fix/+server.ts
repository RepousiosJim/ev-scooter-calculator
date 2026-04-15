import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { runAutoFix, type FixType } from '$lib/server/verification/auto-fix';

const VALID_FIX_TYPES: readonly FixType[] = ['anomalies', 'seed', 'conflicts', 'duplicates', 'all'];

/**
 * POST /api/admin/auto-fix
 *
 * Run automated data quality fixes.
 * Body: { fixTypes?: ('anomalies' | 'seed' | 'conflicts' | 'duplicates' | 'all')[] }
 */
export const POST: RequestHandler = async ({ cookies, request, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	let fixTypes: FixType[] = ['all'];

	const contentType = request.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			throw error(400, 'Invalid JSON body');
		}

		if (body && typeof body === 'object' && 'fixTypes' in body) {
			const raw = (body as Record<string, unknown>).fixTypes;
			if (Array.isArray(raw)) {
				const validated = raw.filter(
					(t): t is FixType => typeof t === 'string' && VALID_FIX_TYPES.includes(t as FixType)
				);
				if (validated.length > 0) fixTypes = validated;
			}
		}
	}

	const result = await runAutoFix(fixTypes);

	return json(result);
};
