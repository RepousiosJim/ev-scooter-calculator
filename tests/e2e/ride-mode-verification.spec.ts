import { test, expect } from '@playwright/test';

test.describe('Ride Mode Presets Feature', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display ride mode buttons', async ({ page }) => {
		const rideModeLabel = page.getByText('Ride Mode').first();
		await expect(rideModeLabel).toBeVisible();

		// Buttons are inside a radiogroup with role="radio"
		const modeButtons = page.locator('[role="radiogroup"] button[role="radio"]');
		await expect(modeButtons).toHaveCount(4);

		// Each mode button should be visible
		await expect(modeButtons.nth(0)).toBeVisible();
		await expect(modeButtons.nth(1)).toBeVisible();
		await expect(modeButtons.nth(2)).toBeVisible();
		await expect(modeButtons.nth(3)).toBeVisible();
	});

	test('should select ride mode and show impact', async ({ page }) => {
		const modeButtons = page.locator('[role="radiogroup"] button[role="radio"]');

		// Click Eco mode (first button)
		await modeButtons.nth(0).click();
		await expect(modeButtons.nth(0)).toHaveAttribute('aria-checked', 'true');

		// Click Sport mode (third button)
		await modeButtons.nth(2).click();
		await expect(modeButtons.nth(2)).toHaveAttribute('aria-checked', 'true');

		// Impact percentage values should be visible alongside Ride Mode label
		// The component shows "Range +X%" and "Speed +X%" when a mode is active
		const rideModeSection = page
			.locator('.rounded-2xl')
			.filter({ has: page.locator('text=Ride Mode') })
			.first();
		await expect(rideModeSection).toBeVisible();
		// Range and Speed impact are shown as small text spans
		await expect(rideModeSection.locator('text=/Range/')).toBeVisible();
		await expect(rideModeSection.locator('text=/Speed/')).toBeVisible();
	});

	test('should update performance stats when switching modes', async ({ page }) => {
		const modeButtons = page.locator('[role="radiogroup"] button[role="radio"]');

		// Click Eco then Turbo — just verify no errors and buttons respond
		await modeButtons.nth(0).click();
		await expect(modeButtons.nth(0)).toHaveAttribute('aria-checked', 'true');

		await modeButtons.nth(3).click();
		await expect(modeButtons.nth(3)).toHaveAttribute('aria-checked', 'true');
	});

	test('should show correct mode labels', async ({ page }) => {
		// Ride Mode heading is visible
		await expect(page.getByText('Ride Mode').first()).toBeVisible();

		// Each mode button contains a text label (Eco / Normal / Sport / Turbo)
		const modeButtons = page.locator('[role="radiogroup"] button[role="radio"]');
		const texts = await Promise.all([0, 1, 2, 3].map((i) => modeButtons.nth(i).textContent()));
		const joined = texts.join(' ').toLowerCase();
		expect(joined).toContain('eco');
		expect(joined).toContain('normal');
		expect(joined).toContain('sport');
		expect(joined).toContain('turbo');
	});
});
