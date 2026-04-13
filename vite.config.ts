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
	build: {
		// Target modern browsers — smaller output, faster parse
		target: 'es2020',
		// Emit source maps when SENTRY_AUTH_TOKEN is present so Sentry can
		// symbolicate production stack traces. Hidden maps keep the files off the
		// CDN while still uploading them to Sentry.
		sourcemap: !!sentryAuthToken ? 'hidden' : false,
		rollupOptions: {
			output: {
				// Manual chunk splitting to keep the initial JS payload small.
				// Heavy libraries land in named async chunks, only fetched when needed.
				manualChunks(id) {
					// Sentry — large, only needed for error capture, not for rendering
					if (id.includes('@sentry')) return 'sentry';
					// Supabase — only used in server/admin paths
					if (id.includes('@supabase')) return 'supabase';
					// lucide-svelte icons — tree-shaken per component but grouping reduces
					// duplicate module overhead across async chunks
					if (id.includes('lucide-svelte')) return 'icons';
					// Physics engine + presets data — large but shared across all tabs
					if (id.includes('/lib/physics') || id.includes('/lib/data/presets')) return 'engine';
					// satori + resvg are server-only OG image deps — keep them out of
					// any client chunk. Rollup only touches them server-side, but this
					// guard prevents accidental client inclusion if imports shift.
					if (id.includes('satori') || id.includes('resvg')) return 'og-server';
				},
			},
		},
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
					// Cache the Google Fonts CSS manifest (googleapis.com)
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'google-fonts-stylesheets',
							expiration: {
								maxEntries: 5,
								maxAgeSeconds: 60 * 60 * 24 * 365,
							},
						},
					},
					// Cache the actual font files (gstatic.com) — immutable, safe to cache forever
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-webfonts',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 60 * 60 * 24 * 365,
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
});
