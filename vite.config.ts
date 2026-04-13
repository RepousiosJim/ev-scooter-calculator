import { sveltekit } from '@sveltejs/kit/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Only upload source maps when SENTRY_AUTH_TOKEN is present (CI/CD only).
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig({
	server: {
		port: 3000,
	},
	ssr: {
		noExternal: ['lucide-svelte'],
	},
	plugins: [
		sentrySvelteKit({
			autoUploadSourceMaps: !!sentryAuthToken,
			sourceMapsUploadOptions: sentryAuthToken ? { authToken: sentryAuthToken } : undefined,
		}),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg'],
			manifest: {
				name: 'EV Scooter Pro Calculator',
				short_name: 'EV Calc',
				description: 'Performance analysis, hardware compatibility, and upgrade simulation',
				theme_color: '#0f172a',
				background_color: '#0f172a',
				display: 'standalone',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365,
							},
						},
					},
				],
			},
		}),
	],
});
