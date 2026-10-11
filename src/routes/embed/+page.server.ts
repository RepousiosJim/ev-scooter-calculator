import type { PageServerLoad } from './$types';

// Framing headers (`frame-ancestors *`, no X-Frame-Options) for /embed are set
// in hooks.server.ts, which owns the CSP for every response.
export const load: PageServerLoad = async () => {
	return {};
};
