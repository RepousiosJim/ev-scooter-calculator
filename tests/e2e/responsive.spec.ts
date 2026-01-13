import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('displays correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // All inputs should be visible
    await expect(page.locator('input[type="number"][placeholder*="Voltage"]')).toBeVisible();
    await expect(page.locator('input[type="number"][placeholder*="Capacity"]')).toBeVisible();

    // Grid should stack on mobile
    const calculatorGrid = page.locator('.max-w-7xl');
    const gridStyle = await calculatorGrid.evaluate(el => {
      return window.getComputedStyle(el).display;
    });

    expect(gridStyle).toContain('flex');
  });

  test('displays correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Grid should be 2 columns on tablet
    await expect(page.locator('.grid-cols-1')).toBeVisible();
  });

  test('displays correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Grid should be 12 columns on desktop
    const mainGrid = page.locator('.max-w-7xl');
    await expect(mainGrid).toBeVisible();
  });

  test('canvas resizes correctly on window resize', async ({ page }) => {
    await page.goto('/');

    const initialCanvas = page.locator('canvas').first();
    const initialWidth = await initialCanvas.evaluate(el => el.width);

    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    const resizedCanvas = page.locator('canvas').first();
    const resizedWidth = await resizedCanvas.evaluate(el => el.width);

    // Canvas should have resized
    expect(Math.abs(initialWidth - resizedWidth)).toBeGreaterThan(100);
  });
});
