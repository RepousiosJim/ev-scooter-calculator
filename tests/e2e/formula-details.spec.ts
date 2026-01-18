import { test, expect } from '@playwright/test';

test.describe('Formula Details Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays formula details button in results section', async ({ page }) => {
    const formulaButton = page.getByRole('button', { name: /Formula Details/i });
    await expect(formulaButton).toBeVisible();
  });

  test('opens formula details panel when button clicked', async ({ page }) => {
    await page.click('button:has-text("Formula Details")');
    await expect(page.locator('text=Formula Details').first()).toBeVisible();
    await expect(page.locator('text=Temperature Factor').first()).toBeVisible();
  });

  test('hides formula details panel when button clicked again', async ({ page }) => {
    await page.click('button:has-text("Formula Details")');
    await expect(page.locator('.bg-bgCard').filter({ has: page.locator('text=Temperature Factor') })).toBeVisible();

    await page.click('button:has-text("Formula Details")');
    await expect(page.locator('.bg-bgCard').filter({ has: page.locator('text=Temperature Factor') })).not.toBeVisible();
  });

  test('shows all formula categories', async ({ page }) => {
    await page.click('button:has-text("Formula Details")');

    // Check for category headers
    await expect(page.locator('text=energy').first()).toBeVisible();
    await expect(page.locator('text=power').first()).toBeVisible();
    await expect(page.locator('text=speed').first()).toBeVisible();
    await expect(page.locator('text=range').first()).toBeVisible();
    await expect(page.locator('text=charging').first()).toBeVisible();
    await expect(page.locator('text=cost').first()).toBeVisible();
    await expect(page.locator('text=metrics').first()).toBeVisible();
  });

  test('displays formula inputs and results', async ({ page }) => {
    await page.click('button:has-text("Formula Details")');

    // Check for battery energy trace
    const batteryEnergySection = page.locator('text=Battery Energy').first();
    await expect(batteryEnergySection).toBeVisible();

    // Check for formula display
    await expect(page.locator('text=E = V × Ah × SoH × TempFactor')).toBeVisible();
  });

  test('formula values update in real-time when inputs change', async ({ page }) => {
    await page.click('button:has-text("Formula Details")');

    // Get initial battery energy value
    const batterySection = page.locator('text=Battery Energy').locator('..');
    const initialValue = await batterySection.locator('.text-lg.font-bold').textContent();

    // Change battery capacity
    await page.getByLabel('Battery Capacity').fill('30');
    await page.waitForTimeout(500);

    // Check that value updated
    const updatedValue = await batterySection.locator('.text-lg.font-bold').textContent();
    expect(updatedValue).not.toEqual(initialValue);
  });

  test('closes panel with close button', async ({ page }) => {
    await page.click('button:has-text("Formula Details")');
    await expect(page.locator('text=Temperature Factor').first()).toBeVisible();

    await page.click('button:has-text("Close")');
    await expect(page.locator('text=Temperature Factor').first()).not.toBeVisible();
  });
});
