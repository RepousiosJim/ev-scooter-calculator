import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage before each test
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('saves new profile', async ({ page }) => {
    // Configure a setup
    await page.fill('input[type="number"][placeholder*="Voltage"]', '52');
    await page.fill('input[type="number"][placeholder*="Capacity"]', '20');

    // Click save button
    page.on('dialog', dialog => dialog.accept('Test Profile'));
    await page.click('button:has-text("Save Setup")');

    // Open profiles list
    await page.click('button:has-text("My Setups")');

    // Check if profile is saved
    await expect(page.locator('text=Test Profile')).toBeVisible();
  });

  test('loads saved profile', async ({ page }) => {
    // Save a profile first
    await page.fill('input[type="number"][placeholder*="Voltage"]', '48');
    await page.fill('input[type="number"][placeholder*="Capacity"]', '18');
    page.on('dialog', dialog => dialog.accept('Test Profile'));
    await page.click('button:has-text("Save Setup")');

    // Change values
    await page.fill('input[type="number"][placeholder*="Voltage"]', '36');

    // Open profiles and load
    await page.click('button:has-text("My Setups")');
    await page.click('button:has-text("Load")');
    await page.waitForTimeout(500);

    // Voltage should be restored
    const voltageValue = await page.locator('input[type="number"][placeholder*="Voltage"]').inputValue();
    expect(voltageValue).toBe('48');
  });

  test('deletes profile', async ({ page }) => {
    // Save a profile
    await page.click('button:has-text("Save Setup")');
    page.on('dialog', dialog => dialog.accept('Delete Me'));
    await page.click('button:has-text("My Setups")');
    await page.click('button:has-text("Del")');

    // Profile should be removed
    await expect(page.locator('text=Delete Me')).not.toBeVisible();
  });

  test('shows profile count', async ({ page }) => {
    // Save 3 profiles
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Save Setup")');
      page.on('dialog', dialog => dialog.accept(`Profile ${i}`));
    }

    // Profile count should be 3
    const button = page.locator('button:has-text("My Setups")');
    await expect(button).toContainText('(3)');
  });
});
