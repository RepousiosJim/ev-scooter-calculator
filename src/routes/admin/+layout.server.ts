import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { validateSession } from '$lib/server/auth';
import { getStore } from '$lib/server/verification/store';
import { generateAlerts } from '$lib/server/verification/smart-alerts';

export const load: LayoutServerLoad = async ({ route, cookies }) => {
	// Cache headers (`private, no-store`) for all /admin/* routes are set in
	// hooks.server.ts and vercel.json.
	// Auth is enforced in hooks.server.ts; this re-check is defense in depth so
	// a routing quirk that slips past the hook still can't load admin data.
	const isLogin = route.id?.startsWith('/admin/login') ?? false;
	if (!isLogin && !(await validateSession(cookies.get('admin_session')))) {
		throw redirect(303, '/admin/login');
	}

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
