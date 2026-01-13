import { test, expect } from '@playwright/test';

test.describe('Upgrade Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('simulates parallel battery upgrade', async ({ page }) => {
    // Get initial range
    const initialRange = await page.locator('.stat-value').nth(1).textContent();

    // Click parallel upgrade
    await page.click('button:has-text("Add Parallel Battery")');
    await page.waitForTimeout(500);

    // Get updated range
    const updatedRange = await page.locator('.stat-value').nth(1).textContent();

    // Range should approximately double
    const initialRangeNum = parseFloat(initialRange || '0');
    const updatedRangeNum = parseFloat(updatedRange || '0');
    expect(updatedRangeNum).toBeGreaterThan(initialRangeNum * 1.8);
  });

  test('simulates voltage upgrade', async ({ page }) => {
    // Get initial speed
    const initialSpeed = await page.locator('.stat-value').nth(2).textContent();

    // Click voltage upgrade
    await page.click('button:has-text("Voltage Boost")');
    await page.waitForTimeout(500);

    // Get updated speed
    const updatedSpeed = await page.locator('.stat-value').nth(2).textContent();

    // Speed should increase by ~15%
    const initialSpeedNum = parseFloat(initialSpeed || '0');
    const updatedSpeedNum = parseFloat(updatedSpeed || '0');
    expect(updatedSpeedNum).toBeGreaterThan(initialSpeedNum * 1.1);
  });

  test('shows critical upgrade indicator', async ({ page }) => {
    // Configure for high C-rate
    await page.fill('input[type="number"][placeholder*="Voltage"]', '36');
    await page.fill('input[type="number"][placeholder*="Capacity"]', '8');
    await page.fill('input[type="number"][placeholder*="Motor"] >> nth=0', '2');
    await page.fill('input[type="number"][placeholder*="Motor"] >> nth=1', '2500');
    await page.waitForTimeout(500);

    // Should show critical upgrade badge
    await expect(page.locator('text=CRITICAL UPGRADE')).toBeVisible();
  });

  test('clears simulation', async ({ page }) => {
    // Activate upgrade simulation
    await page.click('button:has-text("Add Parallel Battery")');
    await page.waitForTimeout(500);

    // Toggle split view
    await page.check('input[type="checkbox"]');

    // Clear simulation
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(300);

    // Simulated column should show placeholder
    await expect(page.locator('text=Select an upgrade to simulate')).toBeVisible();
  });

  test('shows simulated results in split view', async ({ page }) => {
    // Enable split view
    await page.check('input[type="checkbox"]');

    // Activate upgrade
    await page.click('button:has-text("Add Parallel Battery")');
    await page.waitForTimeout(500);

    // Should show two columns
    await expect(page.locator('text=CURRENT SETUP')).toBeVisible();
    await expect(page.locator('text=SIMULATED UPGRADE')).toBeVisible();

    // Simulated values should be different
    const currentRange = await page.locator('.col-current .stat-value').nth(1).textContent();
    const simRange = await page.locator('.col-simulated .stat-value').nth(1).textContent();

    expect(parseFloat(simRange || '0')).toBeGreaterThan(parseFloat(currentRange || '0'));
  });
});
