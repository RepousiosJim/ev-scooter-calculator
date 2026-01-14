import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('displays correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // All inputs should be visible
    await expect(page.getByLabel('Battery Voltage')).toBeVisible();
    await expect(page.getByLabel('Battery Capacity')).toBeVisible();

    // Main grid should render on mobile
    const mainGrid = page.locator('div.grid.grid-cols-1.lg\\:grid-cols-12').first();
    await expect(mainGrid).toBeVisible();
  });

  test('displays correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Main grid should render on tablet
    const mainGrid = page.locator('div.grid.grid-cols-1.lg\\:grid-cols-12').first();
    await expect(mainGrid).toBeVisible();
  });

  test('displays correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Main grid should render on desktop
    const mainGrid = page.locator('div.grid.grid-cols-1.lg\\:grid-cols-12').first();
    await expect(mainGrid).toBeVisible();
  });

  test('canvas resizes correctly on window resize', async ({ page }) => {
    await page.goto('/');

    const initialCanvas = page.locator('canvas').first();
    const initialWidth = await initialCanvas.evaluate(el => el.getBoundingClientRect().width);

    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    const resizedCanvas = page.locator('canvas').first();
    const resizedWidth = await resizedCanvas.evaluate(el => el.getBoundingClientRect().width);

    // Canvas should have resized
    expect(Math.abs(initialWidth - resizedWidth)).toBeGreaterThan(20);
  });
});
