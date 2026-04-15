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
			// Hobby plan limits deployments to 12 serverless functions.
			// split: false bundles all routes into one function, keeping well under the limit.
			// Revisit with split: true if upgraded to Pro.
			split: false,
			maxDuration: 60,
		}),
	},
};

export default config;
