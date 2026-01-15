import { test, expect, type Page } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('keyboard navigation works through tabs', async ({ page }) => {
    const tabButton = page.locator('role="tab"[aria-selected="true"]');
    await expect(tabButton).toBeVisible();

    await page.keyboard.press('Tab');
    const nextTab = page.locator('role="tab"[aria-selected="true"]');
    await expect(nextTab).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    const prevTab = page.locator('role="tab"[aria-selected="true"]');
    await expect(prevTab).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('preset modal has proper ARIA attributes', async ({ page }) => {
    await page.click('button:has-text("Change preset")');

    const modal = page.locator('role="dialog"[aria-modal="true"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-labelledby');
    await expect(modal).toHaveAttribute('aria-modal');

    const modalButtons = modal.locator('role="option"');
    await expect(modalButtons.first()).toHaveAttribute('aria-selected', 'true');
  });

  test('all form inputs have aria-labels', async ({ page }) => {
    const inputs = page.locator('input[type="number"], input[type="range"], select');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      await expect(input).toHaveAttribute('aria-label');
    }
  });

  test('focus management works correctly', async ({ page }) => {
    const presetButton = page.locator('button:has-text("Change preset")');

    await presetButton.focus();
    await page.keyboard.press('Tab');

    const modal = page.locator('role="dialog"[aria-modal="true"]');
    await expect(modal).toBeVisible();
    
    const closeButton = modal.locator('button[aria-label="Close preset selector"]');
    await expect(closeButton).toBeFocused();
    
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(presetButton).toBeFocused();
  });

  test('slider has aria-valuenow/min/max', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider.first()).toHaveAttribute('aria-valuenow');
    await expect(slider.first()).toHaveAttribute('aria-valuemin');
    await expect(slider.first()).toHaveAttribute('aria-valuemax');
  });

  test('visible focus styles are applied', async ({ page }) => {
    const button = page.locator('button[type="button"]').first();
    
    await button.focus();
    const styles = await button.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });

    expect(styles).toContain('2px solid');
  });

  test('reduced motion is respected', async ({ page }) => {
    const animations = await page.locator('[class*="animate-"]').all();
    const animatedCount = await animations.count();

    expect(animatedCount).toBeGreaterThan(0);
  });
});
