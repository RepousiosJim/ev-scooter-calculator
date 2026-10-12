import type { PageServerLoad } from './$types';
import { requireAdminPage } from '$lib/server/admin-guard';
import { env } from '$env/dynamic/private';
import { isSupabaseAvailable } from '$lib/server/db';
import { canWritePresets } from '$lib/server/verification/preset-writer';
import { getKnownSourceStats } from '$lib/server/verification/known-sources';
import { presetMetadata, CATALOG_VERSION, CATALOG_LAST_UPDATED } from '$lib/data/presets';

/**
 * Read-only configuration status. Everything here is set through environment
 * variables in Vercel (see DEPLOYMENT.md); the deployed site can't store settings
 * in files.
 */
export const load: PageServerLoad = async ({ cookies }) => {
	await requireAdminPage({ cookies });

	const sources = getKnownSourceStats();

	return {
		status: {
			supabase: isSupabaseAvailable(),
			gemini: !!env.GEMINI_API_KEY,
			cronSecret: !!env.CRON_SECRET,
			canWritePresets: canWritePresets(),
			catalogCount: Object.keys(presetMetadata).filter((k) => k !== 'custom').length,
			catalogVersion: CATALOG_VERSION,
			catalogUpdated: CATALOG_LAST_UPDATED,
			scrapableScooters: sources.withSources,
			sourceUrls: sources.totalUrls,
		},
	};
};
