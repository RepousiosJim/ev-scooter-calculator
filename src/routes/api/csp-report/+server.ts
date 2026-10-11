import type { RequestHandler } from './$types';
import { logger } from '$lib/server/logger';
import { checkRateLimit } from '$lib/server/rate-limit';

const MAX_REPORT_BYTES = 8 * 1024;

/**
 * Receives Content-Security-Policy-Report-Only violation reports (see kit.csp
 * in svelte.config.js) and logs them, so the stricter policy can be checked
 * against real traffic before it is enforced. Always answers 204.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const rl = await checkRateLimit(getClientAddress(), 30, { scope: 'csp-report' });
	if (!rl.allowed) return new Response(null, { status: 204 });

	const body = (await request.text()).slice(0, MAX_REPORT_BYTES);
	try {
		const parsed = JSON.parse(body);
		// Legacy report-uri format: { "csp-report": {...} }; Reporting API: [{ body: {...} }]
		const reports = Array.isArray(parsed) ? parsed.map((r) => r?.body) : [parsed?.['csp-report']];
		for (const r of reports) {
			if (!r) continue;
			logger.warn(
				{
					directive: r['violated-directive'] ?? r.effectiveDirective,
					blocked: r['blocked-uri'] ?? r.blockedURL,
					page: r['document-uri'] ?? r.documentURL,
				},
				'[csp-report] report-only violation'
			);
		}
	} catch {
		// Malformed report — ignore.
	}
	return new Response(null, { status: 204 });
};
