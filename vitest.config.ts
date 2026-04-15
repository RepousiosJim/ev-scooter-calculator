import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/unit/**/*.spec.ts'],
		exclude: ['tests/e2e/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/**/*.svelte',
				'src/lib/components/**',
				'node_modules/**',
				'.svelte-kit/**',
				'**/*.test.ts',
				'**/*.spec.ts',
			],
			reportsDirectory: 'coverage',
			thresholds: {
				statements: 63,
				branches: 56,
				functions: 67,
				lines: 65,
			},
		},
	},
});
