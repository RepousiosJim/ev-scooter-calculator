import type { LayoutServerLoad } from './$types';
import { getStore } from '$lib/server/verification/store';
import { generateAlerts } from '$lib/server/verification/smart-alerts';

export const load: LayoutServerLoad = async ({ url }) => {
	// Cache headers (`private, no-store`) for all /admin/* routes are set at
	// the CDN layer in vercel.json — not here.
	// Auth is handled by hooks.server.ts — if we get here on non-login pages, user is authenticated
	const isLogin = url.pathname.startsWith('/admin/login');

	let alertCounts = { critical: 0, warning: 0, total: 0 };
	if (!isLogin) {
		try {
			const store = await getStore();
			const all = await store.getAll();
			const summary = generateAlerts(all);
			alertCounts = {
				critical: summary.criticalCount,
				warning: summary.warningCount,
				total: summary.alerts.length,
			};
		} catch {
			// Fail silently — alerts are non-critical
		}
	}

	return { authenticated: !isLogin, alertCounts };
};
