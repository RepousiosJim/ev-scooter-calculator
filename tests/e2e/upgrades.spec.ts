import { test, expect, type Page, type Locator } from '@playwright/test';

const getStatValue = async (scope: Page | Locator, label: string) => {
  const statsGrid = scope.locator('div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4').first();
  const statBox = statsGrid.getByText(label, { exact: true }).locator('..');
  const valueText = await statBox.locator('.text-2xl').textContent();
  return parseFloat(valueText ?? '0');
};

test.describe('Upgrade Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('simulates parallel battery upgrade', async ({ page }) => {
    await page.getByLabel('Split View Simulator').check();

    // Click parallel upgrade
    await page.click('button:has-text("Add Parallel Battery")');
    await page.waitForTimeout(500);

    const currentColumn = page.getByText('CURRENT SETUP').locator('..');
    const simulatedColumn = page.getByText('SIMULATED UPGRADE').locator('..');

    const currentRange = await getStatValue(currentColumn, 'Range');
    const simulatedRange = await getStatValue(simulatedColumn, 'Range');

    expect(simulatedRange).toBeGreaterThan(currentRange * 1.1);
  });

  test('simulates voltage upgrade', async ({ page }) => {
    await page.getByLabel('Split View Simulator').check();

    // Click voltage upgrade
    await page.click('button:has-text("Voltage Boost")');
    await page.waitForTimeout(500);

    const currentColumn = page.getByText('CURRENT SETUP').locator('..');
    const simulatedColumn = page.getByText('SIMULATED UPGRADE').locator('..');

    const currentSpeed = await getStatValue(currentColumn, 'Top Speed');
    const simulatedSpeed = await getStatValue(simulatedColumn, 'Top Speed');

    expect(simulatedSpeed).toBeGreaterThan(currentSpeed * 1.05);
  });

  test('shows critical upgrade indicator', async ({ page }) => {
    // Configure for high C-rate
    await page.getByLabel('Battery Voltage').fill('36');
    await page.getByLabel('Battery Capacity').fill('8');
    await page.getByLabel('Motor Count').fill('2');
    await page.getByLabel('Power per Motor').fill('2500');
    await page.waitForTimeout(500);

    // Should show critical upgrade badge
    await expect(page.locator('text=CRITICAL UPGRADE')).toBeVisible();
  });

  test('shows placeholder before upgrade selection', async ({ page }) => {
    await page.getByLabel('Split View Simulator').check();

    await expect(page.locator('text=Select an upgrade to simulate')).toBeVisible();
  });

  test('shows simulated results in split view', async ({ page }) => {
    // Enable split view
    await page.getByLabel('Split View Simulator').check();

    // Activate upgrade
    await page.click('button:has-text("Add Parallel Battery")');
    await page.waitForTimeout(500);

    // Should show two columns
    await expect(page.locator('text=CURRENT SETUP')).toBeVisible();
    await expect(page.locator('text=SIMULATED UPGRADE')).toBeVisible();

    // Simulated values should be different
    const currentColumn = page.getByText('CURRENT SETUP').locator('..');
    const simulatedColumn = page.getByText('SIMULATED UPGRADE').locator('..');

    const currentRange = await getStatValue(currentColumn, 'Range');
    const simulatedRange = await getStatValue(simulatedColumn, 'Range');

    expect(simulatedRange).toBeGreaterThan(currentRange);
  });
});
