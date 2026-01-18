import { test, expect, type Page } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.skip('keyboard navigation works through tabs', async ({ page }) => {
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();

    await page.keyboard.press('Tab');
    const firstTab = tabs.first();
    await expect(firstTab).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(100);
  });

  test('preset modal has proper ARIA attributes', async ({ page }) => {
    await page.click('text=Change preset');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBeTruthy();
    expect(ariaLabelledBy?.length).toBeGreaterThan(0);

    const modalButtons = modal.getByRole('option');
    await expect(modalButtons.first()).toHaveAttribute('aria-selected', 'true');
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

  test.skip('focus management works correctly', async ({ page }) => {
    const presetButton = page.locator('button:has-text("Change preset")');

    await presetButton.focus();
    await presetButton.click();
    await page.waitForTimeout(100);

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    const closeButton = modal.locator('button[aria-label="Close preset selector"]');
    await expect(closeButton).toBeFocused();
    
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test.skip('slider has aria-valuenow/min/max', async ({ page }) => {
    await page.click('text=Advanced Settings');
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
        boxShadow: computed.boxShadow
      };
    });

    const hasVisibleFocus = 
      (styles.outline && styles.outline !== 'none' && styles.outline !== '0px') ||
      (styles.boxShadow && styles.boxShadow !== 'none');

    expect(hasVisibleFocus).toBe(true);
  });

  test.skip('reduced motion is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const animatedElements = await page.locator('[class*="animate-"]').all();
    const styles = await Promise.all(
      animatedElements.map(el => el.evaluate(node => window.getComputedStyle(node).animationPlayState))
    );

    const allPausedOrReduced = styles.every(state =>
      state === 'paused' || state === 'initial'
    );

    expect(animatedElements.length).toBeGreaterThan(0);
    expect(allPausedOrReduced).toBe(true);
  });
});
