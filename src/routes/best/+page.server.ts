import type { PageServerLoad } from './$types';
import { collections, buildCollectionEntries } from '$lib/data/collections';

export interface CollectionSummary {
	slug: string;
	h1: string;
	title: string;
	description: string;
	keyword: string;
	count: number;
	topScooterName: string | null;
}

export interface CollectionIndexPageData {
	collections: CollectionSummary[];
}

// Prerender — derived purely from preset catalog.
export const prerender = true;

export const load: PageServerLoad = () => {
	const summaries: CollectionSummary[] = collections.map((c) => {
		const entries = buildCollectionEntries(c);
		return {
			slug: c.slug,
			h1: c.h1,
			title: c.title,
			description: c.description,
			keyword: c.keyword,
			count: entries.length,
			topScooterName: entries[0]?.name ?? null,
		};
	});

	return { collections: summaries } satisfies CollectionIndexPageData;
};
