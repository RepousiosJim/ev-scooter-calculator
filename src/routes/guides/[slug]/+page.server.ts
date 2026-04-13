import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGuideBySlug } from '$lib/data/guides';

export const load: PageServerLoad = ({ params }) => {
	const guide = getGuideBySlug(params.slug);

	if (!guide) {
		error(404, { message: 'Guide not found' });
	}

	return { guide };
};
