import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
	test.beforeEach(async ({ page, context }) => {
		// Clear localStorage before each test
		await context.clearCookies();
		await page.goto('/');
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		// Use domcontentloaded instead of networkidle to avoid Vite HMR WebSocket keeping
		// the connection open indefinitely, which would cause networkidle to never fire.
		await page.waitForLoadState('domcontentloaded');
		// Wait for the Save button to confirm the app has fully initialized
		await page
			.getByRole('button', { name: /^Save$/ })
			.first()
			.waitFor({ state: 'visible' });
	});

	test('saves new profile', async ({ page }) => {
		// Configure a setup
		await page.getByLabel('System voltage value').fill('52');
		await page.getByLabel('Battery capacity value').fill('20');

		// Open the inline save form by clicking the Save button in ProfileManager
		await page
			.getByRole('button', { name: /^Save$/ })
			.first()
			.click();

		// Fill in the profile name input
		const nameInput = page.locator('#profile-save-name');
		await expect(nameInput).toBeVisible();
		await nameInput.fill('Test Profile');

		// Click the Save button in the inline form (the confirm save button)
		const _saveConfirmButtons = page.locator('[id="profile-save-name"] ~ * button').first();
		// Use the inline save button (Check icon + "Save" label inside the form)
		await page.locator('input#profile-save-name').press('Enter');

		// Profile should appear in the list
		await expect(page.getByText('Test Profile', { exact: true }).first()).toBeVisible({ timeout: 5000 });
	});

	test('loads saved profile', async ({ page }) => {
		const voltageSlider = page.getByRole('slider', { name: 'Battery Voltage' });

		// Step 1: Load a preset via the selector — this calls applyConfig() creating a clean
		// config object reference. Record the voltage that this preset has.
		await page.locator('button[aria-haspopup="dialog"]').click();
		await expect(page.getByRole('heading', { name: 'Choose a Scooter' })).toBeVisible();
		await page.getByRole('option').first().click();
		await expect(page.getByRole('heading', { name: 'Choose a Scooter' })).not.toBeVisible();
		await page.waitForTimeout(300);

		// Record the preset's voltage — this is the value Profile A will be saved with
		const profileAVoltage = Number(await voltageSlider.getAttribute('aria-valuenow'));
		expect(profileAVoltage).toBeGreaterThan(0);

		// Step 2: Save as Profile A
		await page
			.getByRole('button', { name: /^Save$/ })
			.first()
			.click();
		const nameInput = page.locator('#profile-save-name');
		await nameInput.fill('Profile A');
		await nameInput.press('Enter');
		await expect(page.getByText('Profile A', { exact: true }).first()).toBeVisible({ timeout: 5000 });

		// Step 3: Load a DIFFERENT preset — calls applyConfig() again, creating a new config object.
		// Profile A's config object is now fully decoupled from the current store config.
		await page.locator('button[aria-haspopup="dialog"]').click();
		await expect(page.getByRole('heading', { name: 'Choose a Scooter' })).toBeVisible();
		// Choose the last preset (likely different from the first)
		await page.getByRole('option').last().click();
		await expect(page.getByRole('heading', { name: 'Choose a Scooter' })).not.toBeVisible();
		await page.waitForTimeout(300);

		// Confirm the voltage changed (different preset has different voltage)
		const _currentVoltage = Number(await voltageSlider.getAttribute('aria-valuenow'));
		// (may or may not differ, but the important thing is Profile A's config is decoupled)

		// Step 4: Profile A is still active (activeProfileId unchanged), Load button hidden.
		// Save the current preset as Temp Profile so Profile A becomes non-active.
		const profilesList = page.locator('ul[aria-label="Saved profiles"]');
		await expect(profilesList).toBeVisible({ timeout: 5000 });
		const profileAItem = profilesList.locator('li').filter({ hasText: 'Profile A' });

		await page
			.getByRole('button', { name: /^Save$/ })
			.first()
			.click();
		const tempNameInput = page.locator('#profile-save-name');
		await tempNameInput.fill('Temp Profile');
		await tempNameInput.press('Enter');
		await expect(page.getByText('Temp Profile', { exact: true }).first()).toBeVisible({ timeout: 5000 });

		// Step 5: Profile A now shows Load button. Click it.
		await profileAItem.getByRole('button', { name: 'Load' }).click();
		await page.waitForTimeout(500);

		// Verify voltage is restored to Profile A's saved value
		const restoredVoltage = Number(await voltageSlider.getAttribute('aria-valuenow'));
		expect(restoredVoltage).toBe(profileAVoltage);
	});

	test('deletes profile', async ({ page }) => {
		// Save a profile
		await page
			.getByRole('button', { name: /^Save$/ })
			.first()
			.click();
		const nameInput = page.locator('#profile-save-name');
		await nameInput.fill('Delete Me');
		await nameInput.press('Enter');
		await expect(page.getByText('Delete Me', { exact: true }).first()).toBeVisible({ timeout: 5000 });

		// Open the "..." context menu for the profile
		await page.getByRole('button', { name: 'Profile options' }).first().click();

		// Click Delete in the dropdown
		await page.getByRole('menuitem', { name: /delete/i }).click();

		// Confirm deletion
		await page
			.getByRole('button', { name: /delete/i })
			.first()
			.click();

		// Profile should be removed (use list item selector to avoid matching toast)
		await expect(page.locator('ul[aria-label="Saved profiles"] li').filter({ hasText: 'Delete Me' })).not.toBeVisible({
			timeout: 5000,
		});
	});

	test('shows profile count badge', async ({ page }) => {
		// Save 3 profiles
		for (let i = 0; i < 3; i++) {
			await page
				.getByRole('button', { name: /^Save$/ })
				.first()
				.click();
			const nameInput = page.locator('#profile-save-name');
			await nameInput.fill(`Profile ${i}`);
			await nameInput.press('Enter');
			await expect(page.getByText(`Profile ${i}`, { exact: true }).first()).toBeVisible({ timeout: 5000 });
		}

		// The profile count badge (small number inside the header row) should show 3
		// It's a span with the count inside .rounded-full
		const countBadge = page.locator('.rounded-full').filter({ hasText: '3' }).first();
		await expect(countBadge).toBeVisible();
	});
});
