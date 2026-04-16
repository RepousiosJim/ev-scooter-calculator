import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { collections, getCollection, buildCollectionEntries, type CollectionEntry } from '$lib/data/collections';

export interface CollectionPageData {
	slug: string;
	h1: string;
	title: string;
	description: string;
	intro: string;
	keyword: string;
	sortLabel: string;
	entries: CollectionEntry[];
	relatedCollections: { slug: string; h1: string }[];
}

// Prerender every collection page at build time — the ranking is deterministic from the preset
// catalog, so these pages are effectively static and can live on the CDN.
export const prerender = true;

export const entries = () => collections.map((c) => ({ slug: c.slug }));

export const load: PageServerLoad = ({ params }) => {
	const collection = getCollection(params.slug);
	if (!collection) {
		error(404, { message: 'Collection not found' });
	}

	const entries = buildCollectionEntries(collection);

	const relatedCollections = collections
		.filter((c) => c.slug !== collection.slug)
		.slice(0, 4)
		.map((c) => ({ slug: c.slug, h1: c.h1 }));

	return {
		slug: collection.slug,
		h1: collection.h1,
		title: collection.title,
		description: collection.description,
		intro: collection.intro,
		keyword: collection.keyword,
		sortLabel: collection.sortLabel,
		entries,
		relatedCollections,
	} satisfies CollectionPageData;
};
