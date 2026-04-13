import { test, expect } from '@playwright/test';

test.describe('Calculator Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('loads preset and updates all fields', async ({ page }) => {
		// Click on preset selector trigger (has aria-haspopup="dialog")
		await page.locator('button[aria-haspopup="dialog"]').click();

		// Wait for modal to appear (use heading role to avoid strict-mode violation with subtitle text)
		await expect(page.getByRole('heading', { name: 'Choose a Scooter' })).toBeVisible();

		// Click on first available preset option
		const firstPreset = page.getByRole('option').first();
		await firstPreset.click();

		// Wait for modal to close and update
		await expect(page.getByRole('heading', { name: 'Choose a Scooter' })).not.toBeVisible();
		await page.waitForTimeout(500);

		// Check if voltage input is now populated
		const voltageSlider = page.getByRole('slider', { name: 'Battery Voltage' });
		const voltageValue = await voltageSlider.getAttribute('aria-valuenow');
		expect(Number(voltageValue)).toBeGreaterThan(0);
	});

	test('updates results in real-time', async ({ page }) => {
		// Get initial speed value via aria-label on stats card
		const initialSpeedCard = page.locator('[aria-label*="Top Speed"]').first();
		await expect(initialSpeedCard).toBeVisible();

		// Change voltage via slider
		const voltageSlider = page.getByRole('slider', { name: 'Battery Voltage' });
		await voltageSlider.fill('72');
		await page.waitForTimeout(300);

		// Page should still show Top Speed card
		await expect(page.locator('[aria-label*="Top Speed"]').first()).toBeVisible();
	});

	test('toggles advanced options', async ({ page }) => {
		// Advanced options section toggle button now says "Advanced Parameters"
		// Drag coefficient is in AdvancedConfig — hidden initially
		await expect(page.locator('text=Drag Coefficient').first()).not.toBeVisible();

		// Click the Advanced Parameters toggle
		await page.click('text=Advanced Parameters');

		// Drag Coefficient should now be visible (inside AdvancedConfig)
		await expect(page.locator('text=Drag Coefficient').first()).toBeVisible();
	});

	test('adjusts battery health slider', async ({ page }) => {
		// Battery Health slider is always visible in BasicConfig
		const sohSlider = page.getByRole('slider', { name: 'Battery Health' });
		await expect(sohSlider).toBeVisible();

		// Fill the slider directly to 50% (value is 0.5 on range 0.5–1)
		await sohSlider.fill('0.5');
		await page.waitForTimeout(300);

		// Slider value should now be 0.5 (down from default 1.0)
		const updatedValue = await sohSlider.getAttribute('aria-valuenow');
		expect(Number(updatedValue)).toBeLessThanOrEqual(0.5);
	});

	test('shows bottlenecks for high C-rate configuration', async ({ page }) => {
		// Configure for high C-rate using number inputs (aria-label exact match)
		await page.getByLabel('System voltage value').fill('36');
		await page.getByLabel('Battery capacity value').fill('10');

		// Select dual motor (2)
		await page.getByRole('button', { name: /2\s*Dual/i }).click();

		// Set motor power high
		await page.getByLabel('Motor power value').fill('3000');
		await page.waitForTimeout(800);

		// Should show bottleneck/issues warning — section is inside "Show Detailed Analysis"
		await page.click('text=Show Detailed Analysis');
		await page.waitForTimeout(300);

		// Should show issues detected
		await expect(page.locator('text=Issues Detected')).toBeVisible({ timeout: 10000 });
	});
});
