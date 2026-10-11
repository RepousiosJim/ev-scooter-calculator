import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] },
		},
		{
			name: 'Mobile Safari',
			use: { ...devices['iPhone 12'] },
		},
	],

	// CI tests the production build (`npm run build` runs first) via `vite preview`;
	// locally, the dev server is reused for speed.
	webServer: process.env.CI
		? {
				command: 'npm run preview -- --port 4173 --strictPort',
				url: 'http://localhost:4173',
				reuseExistingServer: false,
			}
		: {
				command: 'npm run dev',
				url: 'http://localhost:3000',
				reuseExistingServer: true,
			},
});
