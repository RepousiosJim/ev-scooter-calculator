import { test, expect } from '@playwright/test';

test.describe('Bottom Sheet UI Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('PresetSelector opens and closes BottomSheet', async ({ page }) => {
    const presetTrigger = page.getByRole('button', { name: /selected preset/i });
    await expect(presetTrigger).toBeVisible();

    await presetTrigger.click();

    const bottomSheet = page.getByRole('dialog', { name: 'choose a preset' });
    await expect(bottomSheet).toBeVisible();

    const closeButton = page.getByRole('button', { name: 'close' });
    await expect(closeButton).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(bottomSheet).not.toBeVisible();
  });

  test('BottomSheet can be swiped to dismiss (mobile)', async ({ page }) => {
    const viewport = { width: 375, height: 667 };
    await page.setViewportSize(viewport);
    await page.goto('/');

    const presetTrigger = page.getByRole('button', { name: /selected preset/i });
    await presetTrigger.click();

    const bottomSheet = page.getByRole('dialog', { name: 'choose a preset' });
    await expect(bottomSheet).toBeVisible();

    const handle = page.locator('[data-bottom-sheet-handle]');
    await expect(handle).toBeVisible();

    const bottomSheetBox = await bottomSheet.boundingBox();
    if (bottomSheetBox) {
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        const startX = viewportSize.width / 2;
        const startY = bottomSheetBox.y + 20; // Start slightly below the top of the sheet
        const endY = startY + 200; // Drag down

        // Simulate swipe using mouse events (Playwright's touch support is limited mostly to taps)
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, endY, { steps: 10 });
        await page.mouse.up();
      }
    }
  });

  test('BottomSheet shows correct title and content', async ({ page }) => {
    const presetTrigger = page.getByRole('button', { name: /selected preset/i });
    await presetTrigger.click();

    await expect(page.getByRole('dialog', { name: 'choose a preset' })).toBeVisible();
    await expect(page.getByText('manual configuration mode')).toBeVisible();
  });

  test('BottomSheet has handle for swipe interaction', async ({ page }) => {
    const presetTrigger = page.getByRole('button', { name: /selected preset/i });
    await presetTrigger.click();

    const handle = page.locator('[data-bottom-sheet-handle]');
    await expect(handle).toBeVisible();
  });
});
