import { test, expect } from '@playwright/test';

test.describe('Main Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/EV Scooter Pro Calculator/);
  });

  test('displays all calculator inputs', async ({ page }) => {
    await expect(page.locator('input[type="number"][placeholder*="Voltage"]')).toBeVisible();
    await expect(page.locator('input[type="number"][placeholder*="Capacity"]')).toBeVisible();
    await expect(page.locator('input[type="number"][placeholder*="Motor"]')).toBeVisible();
    await expect(page.locator('input[type="number"][placeholder*="Weight"]')).toBeVisible();
  });

  test('calculates performance metrics on input change', async ({ page }) => {
    const voltageInput = page.locator('input[type="number"][placeholder*="Voltage"]');

    // Wait for initial calculation
    await page.waitForTimeout(500);

    // Get initial energy value
    const initialEnergy = await page.locator('.stat-value').first().textContent();

    // Change voltage
    await voltageInput.fill('72');
    await page.waitForTimeout(500);

    // Get updated energy value
    const updatedEnergy = await page.locator('.stat-value').first().textContent();

    // Energy should increase
    expect(parseFloat(updatedEnergy || '0')).toBeGreaterThan(parseFloat(initialEnergy || '0'));
  });

  test('displays power graph', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible();

    // Canvas should have dimensions
    const canvas = page.locator('canvas').first();
    await expect(canvas).toHaveJSProperty('width', expect.any(Number));
    await expect(canvas).toHaveJSProperty('height', expect.any(Number));
  });

  test('shows component status cards', async ({ page }) => {
    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=Battery')).toBeVisible();
    await expect(page.locator('text=Controller')).toBeVisible();
    await expect(page.locator('text=Motor')).toBeVisible();
  });

  test('toggles advanced options', async ({ page }) => {
    // Advanced options should be hidden initially
    await expect(page.locator('text=Rider Weight')).not.toBeVisible();

    // Click toggle
    await page.click('text=Advanced Options');

    // Advanced options should be visible
    await expect(page.locator('text=Rider Weight')).toBeVisible();
  });

  test('adjusts battery health slider', async ({ page }) => {
    // Click toggle to show battery health slider
    await page.click('text=Advanced Options');

    // Get initial range
    const initialRange = await page.locator('.stat-value').nth(1).textContent();

    // Adjust battery health to 50%
    await page.fill('input[type="range"]', '50');
    await page.waitForTimeout(300);

    // Get updated range
    const updatedRange = await page.locator('.stat-value').nth(1).textContent();

    // Range should decrease
    expect(parseFloat(updatedRange || '0')).toBeLessThan(parseFloat(initialRange || '0'));
  });

  test('shows bottlenecks for high C-rate configuration', async ({ page }) => {
    // Configure for high C-rate
    await page.fill('input[type="number"][placeholder*="Voltage"]', '36');
    await page.fill('input[type="number"][placeholder*="Capacity"]', '10');
    await page.fill('input[type="number"][placeholder*="Motor"] >> nth=0', '2');
    await page.fill('input[type="number"][placeholder*="Motor"] >> nth=1', '3000');
    await page.waitForTimeout(500);

    // Should show bottleneck warning
    await expect(page.locator('text=Bottlenecks Detected')).toBeVisible();
  });
});
