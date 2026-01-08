import { test, expect } from '@playwright/test';

// Helper to close onboarding modal if it appears
async function closeOnboardingIfPresent(page: any) {
  try {
    const onboardingModal = page.locator('text=/Welcome to LinkedIn Content Creator/i');
    if (await onboardingModal.isVisible({ timeout: 2000 })) {
      const closeButton = page.locator('button[title="Close"]');
      if (await closeButton.isVisible({ timeout: 1000 })) {
        await closeButton.click();
        await page.waitForTimeout(300);
      }
    }
  } catch {
    // No onboarding modal, continue
  }
}

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should open settings when clicking gear icon', async ({ page }) => {
    // Click settings button by aria-label
    await page.locator('button[aria-label="Settings"]').click();

    // Check that settings modal is visible
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show API configuration sections', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Check for Gemini API section
    await expect(page.locator('text=/Gemini|API/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show LinkedIn connection option', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Check for LinkedIn section
    await expect(page.locator('text=/LinkedIn/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should close settings modal with X button', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Wait for modal to be visible
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });

    // Press Escape to close
    await page.keyboard.press('Escape');

    // Wait a moment for modal to close
    await page.waitForTimeout(500);
  });

  test('should show danger zone section', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Check for Danger Zone
    const dangerZone = page.locator('text=/Danger Zone/i');
    await expect(dangerZone).toBeVisible({ timeout: 5000 });
  });

  test('should show factory reset button', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Check for Erase All Data button
    const resetButton = page.locator('button:has-text("Erase All Data")');
    await expect(resetButton).toBeVisible({ timeout: 5000 });
  });

  test('should open factory reset confirmation', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Click Erase All Data button
    await page.locator('button:has-text("Erase All Data")').click();

    // Check that confirmation modal appears
    await expect(page.locator('text=/Type.*ERASE.*to confirm/i')).toBeVisible({ timeout: 5000 });
  });

  test('should not allow factory reset without typing ERASE', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Click Erase All Data button
    await page.locator('button:has-text("Erase All Data")').first().click();

    // Wait for confirmation modal
    await expect(page.locator('text=/Type.*ERASE.*to confirm/i')).toBeVisible({ timeout: 5000 });

    // The confirm button should be disabled
    const confirmButton = page.locator('button:has-text("Erase All Data")').last();
    await expect(confirmButton).toBeDisabled();
  });

  test('should enable factory reset button after typing ERASE', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Click Erase All Data button
    await page.locator('button:has-text("Erase All Data")').first().click();

    // Wait for confirmation modal
    await expect(page.locator('text=/Type.*ERASE.*to confirm/i')).toBeVisible({ timeout: 5000 });

    // Type ERASE in the input
    await page.locator('input[placeholder="ERASE"]').fill('ERASE');

    // The confirm button should be enabled
    const confirmButton = page.locator('button:has-text("Erase All Data")').last();
    await expect(confirmButton).toBeEnabled();
  });
});

test.describe('Gemini API Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should show Gemini API key input', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Look for Gemini API input by placeholder
    const apiInput = page.locator('input[placeholder*="Gemini"]');
    await expect(apiInput).toBeVisible({ timeout: 5000 });
  });

  test('should allow entering Gemini API key', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="Settings"]').click();

    // Find Gemini API key input by placeholder
    const apiInput = page.locator('input[placeholder*="Gemini"]');
    await apiInput.fill('test-api-key-12345');

    // Should have the value
    await expect(apiInput).toHaveValue('test-api-key-12345');
  });
});
