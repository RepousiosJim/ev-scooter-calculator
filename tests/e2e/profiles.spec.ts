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
    await page.getByLabel('Battery Voltage').fill('52');
    await page.getByLabel('Battery Capacity').fill('20');

    // Click save button
    page.once('dialog', dialog => dialog.accept('Test Profile'));
    await page.click('button:has-text("Save Setup")');

    // Open profiles list
    await page.click('button:has-text("My Setups")');

    // Check if profile is saved
    await expect(page.locator('text=Test Profile')).toBeVisible();
  });

  test('loads saved profile', async ({ page }) => {
    // Save a profile first
    await page.getByLabel('Battery Voltage').fill('48');
    await page.getByLabel('Battery Capacity').fill('18');
    page.once('dialog', dialog => dialog.accept('Test Profile'));
    await page.click('button:has-text("Save Setup")');

    // Change values
    await page.getByLabel('Battery Voltage').fill('36');

    // Open profiles and load
    await page.click('button:has-text("My Setups")');
    await page.getByRole('button', { name: 'Load' }).first().click();
    await page.waitForTimeout(500);

    // Voltage should be restored
    const voltageValue = await page.getByLabel('Battery Voltage').inputValue();
    expect(voltageValue).toBe('48');
  });

  test('deletes profile', async ({ page }) => {
    // Save a profile
    page.once('dialog', dialog => dialog.accept('Delete Me'));
    await page.click('button:has-text("Save Setup")');

    await page.click('button:has-text("My Setups")');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Del' }).first().click();

    // Profile should be removed
    await expect(page.locator('text=Delete Me')).not.toBeVisible();
  });

  test('shows profile count', async ({ page }) => {
    // Save 3 profiles
    for (let i = 0; i < 3; i++) {
      page.once('dialog', dialog => dialog.accept(`Profile ${i}`));
      await page.click('button:has-text("Save Setup")');
    }

    // Profile count should be 3
    const button = page.locator('button:has-text("My Setups")');
    await expect(button).toContainText('(3)');
  });
});
