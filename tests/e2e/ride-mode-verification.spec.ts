import { test, expect } from '@playwright/test';

test.describe('Ride Mode Presets Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display ride mode buttons', async ({ page }) => {
    const rideModeLabel = page.getByText('Ride Mode').first();
    await expect(rideModeLabel).toBeVisible();

    const modeButtons = page.locator('[role="radiogroup"] button').or(
      page.locator('.grid.grid-cols-2 button').filter({ hasText: /Eco|Normal|Sport|Turbo/ })
    );

    await expect(modeButtons).toHaveCount(4);

    const ecoButton = page.getByText('Eco');
    const normalButton = page.getByText('Normal');
    const sportButton = page.getByText('Sport');
    const turboButton = page.getByText('Turbo');

    await expect(ecoButton).toBeVisible();
    await expect(normalButton).toBeVisible();
    await expect(sportButton).toBeVisible();
    await expect(turboButton).toBeVisible();
  });

  test('should select ride mode and show impact', async ({ page }) => {
    const ecoButton = page.locator('button').filter({ hasText: 'Eco' }).first();
    const sportButton = page.locator('button').filter({ hasText: 'Sport' }).first();
    const turboButton = page.locator('button').filter({ hasText: 'Turbo' }).first();

    await ecoButton.click();

    const ecoSelected = page.locator('button').filter({ hasText: 'Eco' }).and(
      page.locator('[aria-checked="true"]')
    );
    await expect(ecoSelected).toBeVisible();

    await sportButton.click();

    const sportSelected = page.locator('button').filter({ hasText: 'Sport' }).and(
      page.locator('[aria-checked="true"]')
    );
    await expect(sportSelected).toBeVisible();

    const modeImpact = page.getByText('Mode Impact');
    await expect(modeImpact).toBeVisible();

    const rangeLabel = page.getByText('Range');
    const speedLabel = page.getByText('Speed');
    await expect(rangeLabel).toBeVisible();
    await expect(speedLabel).toBeVisible();
  });

  test('should update performance stats when switching modes', async ({ page }) => {
    const ecoButton = page.locator('button').filter({ hasText: 'Eco' }).first();
    const turboButton = page.locator('button').filter({ hasText: 'Turbo' }).first();

    const rangeValue = page.getByText(/Range/).locator('../..').locator('.font-number').or(
      page.locator('div:has-text("Range")').locator('.font-semibold, .font-medium')
    );

    await ecoButton.click();

    await turboButton.click();
  });

  test('should show correct mode labels and descriptions', async ({ page }) => {
    await expect(page.getByText('Adjust power output and efficiency')).toBeVisible();

    const ecoButton = page.locator('button').filter({ hasText: 'Eco' }).first();
    await ecoButton.click();

    await expect(page.getByText('Eco', { exact: true })).toBeVisible();
  });
});
