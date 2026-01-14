import { test, expect, type Page } from '@playwright/test';

const getStatValue = async (page: Page, label: string) => {
  const statsGrid = page.locator('div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4').first();
  const statBox = statsGrid.getByText(label, { exact: true }).locator('..');
  const valueText = await statBox.locator('.text-2xl').textContent();
  return parseFloat(valueText ?? '0');
};

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
    const voltageValue = await page.getByLabel('Battery Voltage').inputValue();
    expect(voltageValue).toBe('36');

    // Check if motor count changed to 1
    const motorCount = await page.getByLabel('Motor Count').inputValue();
    expect(motorCount).toBe('1');
  });

  test('updates results in real-time', async ({ page }) => {
    // Get initial speed value
    const initialSpeed = await getStatValue(page, 'Top Speed');

    // Change voltage
    await page.getByLabel('Battery Voltage').fill('72');
    await page.waitForTimeout(300);

    // Get updated speed value
    const updatedSpeed = await getStatValue(page, 'Top Speed');

    // Speed should increase
    expect(updatedSpeed).toBeGreaterThan(initialSpeed);
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
    const initialRange = await getStatValue(page, 'Range');

    // Adjust battery health to 50%
    await page.getByLabel('Battery Health').fill('50');
    await page.waitForTimeout(300);

    // Get updated range
    const updatedRange = await getStatValue(page, 'Range');

    // Range should decrease
    expect(updatedRange).toBeLessThan(initialRange);
  });

  test('shows bottlenecks for high C-rate configuration', async ({ page }) => {
    // Configure for high C-rate
    await page.getByLabel('Battery Voltage').fill('36');
    await page.getByLabel('Battery Capacity').fill('10');
    await page.getByLabel('Motor Count').fill('2');
    await page.getByLabel('Power per Motor').fill('3000');
    await page.waitForTimeout(500);

    // Should show bottleneck warning
    await expect(page.locator('text=Bottlenecks Detected')).toBeVisible();
  });
});
