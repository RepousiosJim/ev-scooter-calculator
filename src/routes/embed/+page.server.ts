import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({
		'X-Frame-Options': 'ALLOWALL',
		'Content-Security-Policy': 'frame-ancestors *',
	});
};
