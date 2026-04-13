import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			// Bundle each route into its own function file.
			// Keeps cold-start payloads small — heavy admin/scraper code does not
			// land in the same bundle as the lightweight public API routes.
			split: true,
		}),
	},
};

export default config;
