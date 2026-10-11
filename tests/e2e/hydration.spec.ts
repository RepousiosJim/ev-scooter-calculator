import { test, expect } from '@playwright/test';

// A page that fails to hydrate still renders its server HTML, so it looks fine
// but nothing is interactive. Svelte reports it as a console warning only.
const pages = [
	'/',
	'/rankings',
	'/scooter/navee_gt3',
	'/compare/navee-gt3-vs-segway-gt1',
	'/best',
	'/cost',
	'/wizard',
	'/guides',
	'/embed',
];

for (const path of pages) {
	test(`hydrates without errors: ${path}`, async ({ page }) => {
		const problems: string[] = [];
		page.on('console', (msg) => {
			if (msg.text().includes('Failed to hydrate')) problems.push(msg.text());
		});
		page.on('pageerror', (err) => problems.push(err.message));

		await page.goto(path, { waitUntil: 'networkidle' });

		expect(problems).toEqual([]);
	});
}
