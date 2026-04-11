import type { PageServerLoad } from './$types';
import { getSettings, maskSettings } from '$lib/server/verification/settings';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	const masked = maskSettings(settings);

	// Also check env var for Gemini key
	const envGeminiKey = !!env.GEMINI_API_KEY;

	return {
		settings: masked,
		envGeminiKey,
	};
};
