import { test, expect } from '@playwright/test';

test.describe('Calculator Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads preset and updates all fields', async ({ page }) => {
    // Select preset dropdown
    await page.selectOption('select', 'm365');

    // Click load button
    await page.click('button:has-text("Load")');

    // Wait for update
    await page.waitForTimeout(500);

    // Check if voltage changed to 36V (M365 spec)
    const voltageValue = await page.locator('input[type="number"][placeholder*="Voltage"]').inputValue();
    expect(voltageValue).toBe('36');

    // Check if motor count changed to 1
    const motorCount = await page.locator('input[type="number"][placeholder*="Motor"] >> nth=0').inputValue();
    expect(motorCount).toBe('1');
  });

  test('updates results in real-time', async ({ page }) => {
    // Get initial speed value
    const initialSpeed = await page.locator('.stat-value').nth(2).textContent();

    // Change voltage
    await page.fill('input[type="number"][placeholder*="Voltage"]', '72');
    await page.waitForTimeout(300);

    // Get updated speed value
    const updatedSpeed = await page.locator('.stat-value').nth(2).textContent();

    // Speed should increase
    expect(parseFloat(updatedSpeed || '0')).toBeGreaterThan(parseFloat(initialSpeed || '0'));
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
