import { test, expect } from '@playwright/test';

// Helper to close onboarding modal if it appears
async function closeOnboardingIfPresent(page: any) {
  try {
    // Wait briefly to see if onboarding modal appears
    const onboardingModal = page.locator('text=/Welcome to LinkedIn Content Creator/i');
    if (await onboardingModal.isVisible({ timeout: 2000 })) {
      // Close the onboarding modal - click the X button with title="Close"
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

test.describe('App Loading', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Check that the app loads - look for the main content creator heading
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should display the topic input field', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Check for the topic input
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await expect(topicInput).toBeVisible({ timeout: 10000 });
  });

  test('should display content type selector', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for the page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Check for content type options (carousel, image, text)
    const contentTypeButtons = page.locator('button:has-text("Carousel"), button:has-text("Image"), button:has-text("Text")');
    const count = await contentTypeButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open settings modal', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Find and click settings button (by aria-label)
    await page.locator('button[aria-label="Settings"]').click();

    // Check that settings modal opens
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });
  });

  test('should open calendar modal', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Find and click calendar button (by title or aria-label)
    await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();

    // Check that calendar modal opens
    await expect(page.locator('text=/Calendar|Schedule|Month/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Content Creation', () => {
  test('should allow typing in the topic field', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Find and fill the topic input
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('Test topic for LinkedIn post');

    await expect(topicInput).toHaveValue('Test topic for LinkedIn post');
  });

  test('should have generate button', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Check for Generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeVisible();
  });

  test('should disable generate button when topic is empty', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Clear the topic input
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.clear();

    // Generate button should be disabled
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeDisabled();
  });

  test('should have batch mode button', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Check for Batch button
    const batchButton = page.locator('button:has-text("Batch")');
    await expect(batchButton).toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test('should toggle dark/light mode', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeToggle).toBeVisible();

    // Click and verify no error occurs
    await themeToggle.click();
  });
});

test.describe('Connection Status', () => {
  test('should show connection status indicator', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Check for connection status (Connected or Not connected)
    const connectionStatus = page.locator('text=/Connected|Not connected/i');
    await expect(connectionStatus).toBeVisible({ timeout: 5000 });
  });

  test('should show scheduler toggle', async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Check for Scheduler text in header
    const schedulerLabel = page.locator('text=Scheduler');
    await expect(schedulerLabel).toBeVisible({ timeout: 5000 });
  });
});
