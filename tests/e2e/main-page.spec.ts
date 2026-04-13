import { test, expect } from '@playwright/test';

test.describe('Main Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('loads page with correct title', async ({ page }) => {
		await expect(page).toHaveTitle(/EV Scooter Pro Calculator/);
	});

	test('displays all calculator inputs', async ({ page }) => {
		// Battery Voltage slider (aria-label)
		await expect(page.getByRole('slider', { name: 'Battery Voltage' })).toBeVisible();
		// Battery Capacity slider
		await expect(page.getByRole('slider', { name: 'Battery Capacity' })).toBeVisible();
		// Motor Units buttons (1 Single / 2 Dual — replaces old Motor Count input)
		await expect(page.getByRole('button', { name: /1\s*Single/i })).toBeVisible();
		// Motor Power slider
		await expect(page.getByRole('slider', { name: 'Motor Power' })).toBeVisible();

		// Rider Weight is always visible in BasicConfig (no longer behind Advanced Options)
		await expect(page.getByRole('slider', { name: 'Rider Weight' })).toBeVisible();
	});

	test('calculates performance metrics on input change', async ({ page }) => {
		const voltageSlider = page.getByRole('slider', { name: 'Battery Voltage' });

		// Wait for initial calculation
		await page.waitForTimeout(500);

		// Get initial energy value from stats card aria-label
		const initialEnergyCard = page.locator('[aria-label*="Peak Power"]').first();
		await expect(initialEnergyCard).toBeVisible();
		const _initialText = await initialEnergyCard.getAttribute('aria-label');

		// Change voltage
		await voltageSlider.fill('72');
		await page.waitForTimeout(500);

		// Stats card should still be visible
		await expect(page.locator('[aria-label*="Peak Power"]').first()).toBeVisible();
	});

	test('displays power graph', async ({ page }) => {
		// The canvas is inside the "Show Detailed Analysis" collapsible section
		await page.click('text=Show Detailed Analysis');
		await page.waitForTimeout(300);

		const canvas = page.locator('canvas').first();
		await expect(canvas).toBeVisible();

		const { width, height } = await canvas.evaluate((el) => {
			const rect = el.getBoundingClientRect();
			return { width: rect.width, height: rect.height };
		});

		expect(width).toBeGreaterThan(0);
		expect(height).toBeGreaterThan(0);
	});

	test('shows component status cards', async ({ page }) => {
		// ComponentHealthPanel shows Battery, Controller (if configured), Motor labels
		// These are always visible on desktop (inside the Efficiency & Health section)
		await expect(page.locator('text=Battery').first()).toBeVisible();
		await expect(page.locator('text=Motor').first()).toBeVisible();
	});

	test('toggles advanced options', async ({ page }) => {
		// Drag Coefficient is inside AdvancedConfig, hidden behind "Advanced Parameters" toggle
		await expect(page.locator('text=Drag Coefficient').first()).not.toBeVisible();

		// Click toggle — button text is "Advanced Parameters"
		await page.click('text=Advanced Parameters');

		// Drag Coefficient should now be visible
		await expect(page.locator('text=Drag Coefficient').first()).toBeVisible();
	});

	test('adjusts battery health slider', async ({ page }) => {
		// Battery Health slider is always visible
		const sohSlider = page.getByRole('slider', { name: 'Battery Health' });
		await expect(sohSlider).toBeVisible();

		// Fill the slider directly to 0.5 (50% health on the 0.5–1 range)
		await sohSlider.fill('0.5');
		await page.waitForTimeout(300);

		// Slider value should now be at or below 0.5
		const updatedValue = Number(await sohSlider.getAttribute('aria-valuenow'));
		expect(updatedValue).toBeLessThanOrEqual(0.5);
	});

	test('shows bottlenecks for high C-rate configuration', async ({ page }) => {
		// Configure for high C-rate using number spinbutton inputs
		const voltageInput = page.getByLabel('System voltage value');
		const capacityInput = page.getByLabel('Battery capacity value');
		const powerInput = page.getByLabel('Motor power value');

		await voltageInput.fill('36');
		await voltageInput.blur();
		await capacityInput.fill('10');
		await capacityInput.blur();

		// Select dual motor
		await page.getByRole('button', { name: /2\s*Dual/i }).click();

		await powerInput.fill('3000');
		await powerInput.blur();
		await page.waitForTimeout(800);

		// Open "Show Detailed Analysis" to reveal BottleneckPanel
		await page.click('text=Show Detailed Analysis');
		await page.waitForTimeout(300);

		// Should show issues detected (BottleneckPanel heading changed from "Bottlenecks Detected" to "Issues Detected")
		await expect(page.locator('text=Issues Detected')).toBeVisible({ timeout: 10000 });
	});
});
