import type { PageServerLoad } from './$types';
import { getCandidates, getCandidateStats } from '$lib/server/verification/candidate-store';

export const load: PageServerLoad = async () => {
	const candidates = await getCandidates();
	const stats = await getCandidateStats();

	return {
		candidates: candidates.map((c) => ({
			key: c.key,
			name: c.name,
			year: c.year,
			status: c.status,
			config: c.config,
			manufacturerSpecs: c.manufacturerSpecs,
			validation: c.validation,
			sources: c.sources,
			notes: c.notes,
		})),
		stats,
	};
};
