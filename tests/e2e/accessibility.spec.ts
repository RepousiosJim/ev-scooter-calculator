import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('keyboard navigation works through tabs', async ({ page }) => {
		const tabs = page.getByRole('tab');
		await expect(tabs.first()).toBeVisible();

		// Focus the first tab directly (roving tabindex: only active tab has tabindex=0)
		await tabs.first().focus();
		await expect(tabs.first()).toBeFocused();

		// Navigate to next tab with ArrowRight
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(100);
		await expect(tabs.nth(1)).toBeFocused();

		// Navigate back with ArrowLeft
		await page.keyboard.press('ArrowLeft');
		await page.waitForTimeout(100);
		await expect(tabs.first()).toBeFocused();
	});

	test('preset modal has proper ARIA attributes', async ({ page }) => {
		// Click the preset selector trigger (has aria-haspopup="dialog")
		await page.locator('button[aria-haspopup="dialog"]').click();

		const modal = page.getByRole('dialog');
		await expect(modal).toBeVisible();
		await expect(modal).toHaveAttribute('aria-modal', 'true');
		const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
		expect(ariaLabelledBy).toBeTruthy();
		expect(ariaLabelledBy?.length).toBeGreaterThan(0);

		// Select the first preset to make it active
		const modalOptions = modal.getByRole('option');
		await expect(modalOptions.first()).toBeVisible();
		await modalOptions.first().click();
		await page.waitForTimeout(200);

		// Reopen the modal to check aria-selected
		await page.locator('button[aria-haspopup="dialog"]').click();
		await expect(modal).toBeVisible();

		// The first preset option (which was just selected) should have aria-selected="true"
		const selectedOption = modal.getByRole('option', { selected: true });
		await expect(selectedOption).toBeVisible();
		await expect(selectedOption).toHaveAttribute('aria-selected', 'true');
	});

	test('all form inputs have aria-labels', async ({ page }) => {
		const inputs = page.locator('input[type="number"], input[type="range"], select');
		const count = await inputs.count();
		expect(count).toBeGreaterThan(0);

		for (let i = 0; i < count; i++) {
			const input = inputs.nth(i);
			const ariaLabel = await input.getAttribute('aria-label');
			const ariaLabelledBy = await input.getAttribute('aria-labelledby');

			expect(ariaLabel || ariaLabelledBy).toBeTruthy();
		}
	});

	test('focus management works correctly', async ({ page }) => {
		const presetButton = page.locator('button[aria-haspopup="dialog"]');

		await presetButton.focus();
		await presetButton.click();
		await page.waitForTimeout(200);

		const modal = page.getByRole('dialog');
		await expect(modal).toBeVisible();

		const closeButton = modal.locator('button[aria-label="Close preset selector"]');
		await expect(closeButton).toBeVisible();
		await expect(closeButton).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(modal).not.toBeVisible();
	});

	test('slider has aria-valuenow/min/max', async ({ page }) => {
		// Sliders in BasicConfig are always visible on the page
		const slider = page.locator('input[type="range"]').first();

		await expect(slider).toHaveAttribute('aria-valuenow');
		await expect(slider).toHaveAttribute('aria-valuemin');
		await expect(slider).toHaveAttribute('aria-valuemax');
	});

	test('visible focus styles are applied', async ({ page }) => {
		const button = page.locator('button[type="button"]').first();

		await button.focus();
		const styles = await button.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			return {
				outline: computed.outline,
				outlineOffset: computed.outlineOffset,
				boxShadow: computed.boxShadow,
			};
		});

		const hasVisibleFocus =
			(styles.outline && styles.outline !== 'none' && styles.outline !== '0px') ||
			(styles.boxShadow && styles.boxShadow !== 'none');

		expect(hasVisibleFocus).toBe(true);
	});

	test('reduced motion is respected', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });

		const animatedElements = await page.locator('[class*="animate-"]').all();
		const styles = await Promise.all(
			animatedElements.map((el) => el.evaluate((node) => window.getComputedStyle(node).animationPlayState))
		);

		const allPausedOrReduced = styles.every((state) => state === 'paused' || state === 'initial');

		expect(animatedElements.length).toBeGreaterThan(0);
		expect(allPausedOrReduced).toBe(true);
	});
});
