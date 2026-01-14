import { test, expect, type Page, type Locator } from '@playwright/test';

const getComparisonValue = async (scope: Locator, label: string) => {
  const statBox = scope.getByText(label, { exact: true }).locator('..').locator('..');
  const valueText = await statBox.locator('.text-xl').textContent();
  return parseFloat(valueText?.replace(/,/g, '') ?? '0');
};

const getDeltaPercent = async (scope: Locator, label: string) => {
  const statBox = scope.getByText(label, { exact: true }).locator('..').locator('..');
  const deltaBadge = statBox.locator('[class*="DeltaBadge"]');
  const badgeText = await deltaBadge.textContent();
  return badgeText ? parseFloat(badgeText.replace(/[+%]/g, '')) : 0;
};

test.describe('Upgrade Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Upgrades' }).click();
  });

  test('simulates parallel battery upgrade', async ({ page }) => {
    await page.locator('div:has-text("Add Parallel Battery")').first().click();
    await page.waitForTimeout(500);

    const comparisonSection = page.locator('text=Upgrade Comparison').locator('..');
    await expect(comparisonSection).toBeVisible();

    const summarySection = page.locator('text=Top 3 Improvements').locator('..');
    await expect(summarySection).toBeVisible();

    const rangeValue = await getComparisonValue(comparisonSection, 'Range');
    const rangeDelta = await getDeltaPercent(comparisonSection, 'Range');

    expect(rangeValue).toBeGreaterThan(40);
    expect(rangeDelta).toBeGreaterThan(20);
  });

  test('simulates voltage upgrade', async ({ page }) => {
    await page.locator('div:has-text("Voltage Boost")').first().click();
    await page.waitForTimeout(500);

    const comparisonSection = page.locator('text=Upgrade Comparison').locator('..');
    await expect(comparisonSection).toBeVisible();

    const speedValue = await getComparisonValue(comparisonSection, 'Top Speed');
    const speedDelta = await getDeltaPercent(comparisonSection, 'Top Speed');

    expect(speedValue).toBeGreaterThan(45);
    expect(speedDelta).toBeGreaterThan(5);
  });

  test('shows critical upgrade indicator', async ({ page }) => {
    await page.getByRole('button', { name: 'Configuration' }).click();
    await page.getByLabel('Battery Voltage').fill('36');
    await page.getByLabel('Battery Capacity').fill('8');
    await page.getByLabel('Motor Count').fill('2');
    await page.getByLabel('Power per Motor').fill('2500');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Upgrades' }).click();

    const upgradeSection = page.locator('text=Suggested Upgrades').locator('..');
    await expect(upgradeSection).toBeVisible();
    await expect(upgradeSection.getByText('Add Parallel Battery')).toBeVisible();
  });

  test('shows placeholder before upgrade selection', async ({ page }) => {
    await expect(page.locator('text=No upgrade selected')).toBeVisible();
    await expect(page.locator('text=Select an upgrade below to simulate its impact')).toBeVisible();
  });

  test('toggles between Spec and Real-World mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Upgrades' }).click();

    const specButton = page.getByRole('button', { name: 'Spec Mode' }).or(page.getByText('Spec Mode')).first();
    const realworldButton = page.getByRole('button', { name: 'Real-World Mode' }).or(page.getByText('Real-World Mode')).first();

    await expect(specButton).toBeVisible();
    await expect(realworldButton).toBeVisible();

    await specButton.click();
    await expect(realworldButton).toHaveClass(/bg-primary/);

    await realworldButton.click();
    await expect(specButton).toHaveClass(/bg-primary/);
  });

  test('displays recommendation cards with details', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Upgrades' }).click();

    const upgradeSection = page.locator('text=Suggested Upgrades').locator('..');
    await expect(upgradeSection).toBeVisible();

    const cards = await upgradeSection.locator('.cursor-pointer').all();
    expect(cards.length).toBeGreaterThan(0);

    await expect(upgradeSection.locator('text=Why:')).toBeVisible();
    await expect(upgradeSection.locator('text=What it changes:')).toBeVisible();
    await expect(upgradeSection.locator('text=Expected gain:')).toBeVisible();
    await expect(upgradeSection.locator('text=Tradeoffs:')).toBeVisible();
  });

  test('shows no upgrades message when no recommendations', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Battery Voltage').fill('60');
    await page.getByLabel('Battery Capacity').fill('35');
    await page.getByLabel('Motor Count').fill('2');
    await page.getByLabel('Power per Motor').fill('2700');

    await page.getByRole('button', { name: 'Upgrades' }).click();

    const upgradeSection = page.locator('text=Suggested Upgrades').locator('..');
    await expect(upgradeSection.locator('text=No upgrades recommended')).toBeVisible();
  });

  test('shows comparison display with delta badges', async ({ page }) => {
    await page.locator('div:has-text("Add Parallel Battery")').first().click();
    await page.waitForTimeout(500);

    const comparisonSection = page.locator('text=Upgrade Comparison').locator('..');
    
    await expect(comparisonSection).toBeVisible();
    await expect(comparisonSection.getByText('Top Speed')).toBeVisible();
    await expect(comparisonSection.getByText('Range')).toBeVisible();
    await expect(comparisonSection.getByText('Acceleration')).toBeVisible();
    await expect(comparisonSection.getByText('Running Cost')).toBeVisible();

    const deltaBadges = await comparisonSection.locator('[class*="DeltaBadge"]').all();
    expect(deltaBadges.length).toBeGreaterThan(0);
  });

  test('shows secondary stats in comparison', async ({ page }) => {
    await page.locator('div:has-text("Add Parallel Battery")').first().click();
    await page.waitForTimeout(500);

    const comparisonSection = page.locator('text=Upgrade Comparison').locator('..');
    
    await expect(comparisonSection.getByText('Secondary Stats')).toBeVisible();
    await expect(comparisonSection.getByText('Total Energy')).toBeVisible();
    await expect(comparisonSection.getByText('Hill Speed')).toBeVisible();
    await expect(comparisonSection.getByText('Peak Power')).toBeVisible();
    await expect(comparisonSection.getByText('Charge Time')).toBeVisible();
  });
});
