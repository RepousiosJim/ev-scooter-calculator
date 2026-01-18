import { test, expect, type Page } from '@playwright/test';

const getStatValue = async (page: Page, label: string) => {
  const statsGrid = page.locator('div.grid.grid-cols-2.lg\\:grid-cols-4').first();
  const statBox = statsGrid.getByText(label, { exact: true }).locator('..').locator('..');
  const valueText = await statBox.locator('.text-3xl').textContent();
  return parseFloat(valueText ?? '0');
};

test.describe('Main Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/EV Scooter Pro Calculator/);
  });

  test('displays all calculator inputs', async ({ page }) => {
    await expect(page.getByLabel('Battery Voltage')).toBeVisible();
    await expect(page.getByLabel('Battery Capacity')).toBeVisible();
    await expect(page.getByLabel('Motor Count')).toBeVisible();
    await expect(page.getByLabel('Power per Motor')).toBeVisible();

    await page.click('text=Advanced Options');
    await expect(page.getByRole('slider', { name: 'Rider Weight' })).toBeVisible();
  });

  test('calculates performance metrics on input change', async ({ page }) => {
    const voltageInput = page.getByLabel('Battery Voltage');

    // Wait for initial calculation
    await page.waitForTimeout(500);

    // Get initial energy value
    const initialEnergy = await getStatValue(page, 'Total Energy');

    // Change voltage
    await voltageInput.fill('72');
    await page.waitForTimeout(500);

    // Get updated energy value
    const updatedEnergy = await getStatValue(page, 'Total Energy');

    // Energy should increase
    expect(updatedEnergy).toBeGreaterThan(initialEnergy);
  });

  test('displays power graph', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const { width, height } = await canvas.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  test('shows component status cards', async ({ page }) => {
    const statusSection = page.getByRole('heading', { name: 'Component Health' }).locator('..');
    await expect(statusSection).toBeVisible();
    await expect(statusSection.getByText('Battery', { exact: true })).toBeVisible();
    await expect(statusSection.getByText('Controller', { exact: true })).toBeVisible();
    await expect(statusSection.getByText('Motor', { exact: true })).toBeVisible();
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
    const voltageInput = page.getByLabel('Battery Voltage');
    const capacityInput = page.getByLabel('Battery Capacity');
    const motorCountInput = page.getByLabel('Motor Count');
    const powerInput = page.getByLabel('Power per Motor');

    await voltageInput.fill('36');
    await voltageInput.blur();
    await capacityInput.fill('10');
    await capacityInput.blur();
    await motorCountInput.fill('2');
    await motorCountInput.blur();
    await powerInput.fill('3000');
    await powerInput.blur();
    await page.waitForTimeout(800);

    // Should show bottleneck warning
    await expect(page.locator('text=Bottlenecks Detected')).toBeVisible({ timeout: 10000 });
  });
});
