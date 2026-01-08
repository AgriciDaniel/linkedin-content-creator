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

test.describe('Calendar Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    // Wait for page to load
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should open Calendar modal', async ({ page }) => {
    // Click on Calendar button in header
    await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();

    // Check that calendar modal opens
    await expect(page.locator('text=/Calendar|Month|Schedule/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show AI Planner option in calendar', async ({ page }) => {
    // Open calendar
    await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();

    // Look for AI Planner button
    const aiPlannerButton = page.getByRole('button', { name: /AI Planner|Plan with AI/i });
    await expect(aiPlannerButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI Planner Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Open calendar
    await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();

    // Wait for calendar to load
    await page.waitForTimeout(500);
  });

  test('should open AI Planner wizard when clicked', async ({ page }) => {
    // Click AI Planner button
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();

    // Check that the wizard opens - look for duration question
    const durationQuestion = page.locator('text=/How many days/i');
    await expect(durationQuestion).toBeVisible({ timeout: 5000 });
  });

  test('should show duration options', async ({ page }) => {
    // Open AI Planner
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();

    // Check for duration options
    await expect(page.getByRole('button', { name: '7 days' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '14 days' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30 days' })).toBeVisible();
  });

  test('should allow selecting duration and proceeding', async ({ page }) => {
    // Open AI Planner
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();
    await expect(page.locator('text=/How many days/i')).toBeVisible({ timeout: 5000 });

    // Select 7 days option
    await page.getByRole('button', { name: '7 days' }).click();

    // Click Continue
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should move to frequency question
    await expect(page.locator('text=/posts per day|How many posts/i')).toBeVisible({ timeout: 5000 });
  });

  test('should allow navigating back in wizard', async ({ page }) => {
    // Open AI Planner
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();
    await expect(page.locator('text=/How many days/i')).toBeVisible({ timeout: 5000 });

    // Select duration and proceed
    await page.getByRole('button', { name: '7 days' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for frequency question
    await expect(page.locator('text=/posts per day/i')).toBeVisible({ timeout: 5000 });

    // Click Back
    await page.getByRole('button', { name: 'Back' }).click();

    // Should be back at duration question
    await expect(page.locator('text=/How many days/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show progress indicator in wizard', async ({ page }) => {
    // Open AI Planner
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();

    // Check for step indicator (Step X of Y)
    const stepIndicator = page.locator('text=/Step \\d+ of \\d+/');
    await expect(stepIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should show post count preview', async ({ page }) => {
    // Open AI Planner
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();
    await expect(page.locator('text=/How many days/i')).toBeVisible({ timeout: 5000 });

    // Select 7 days
    await page.getByRole('button', { name: '7 days' }).click();

    // Check for posts count indicator
    const postsCount = page.locator('text=/\\d+ posts/i');
    await expect(postsCount).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI Planner - Frequency Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Open calendar and AI Planner
    await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();
    await expect(page.locator('text=/How many days/i')).toBeVisible({ timeout: 5000 });

    // Select duration and proceed
    await page.getByRole('button', { name: '7 days' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
  });

  test('should show frequency options', async ({ page }) => {
    // Check for frequency options
    await expect(page.locator('text=/posts per day/i')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '1 post' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '2 posts' }).first()).toBeVisible();
  });

  test('should allow selecting frequency and proceeding', async ({ page }) => {
    // Select 1 post per day
    await page.getByRole('button', { name: '1 post' }).first().click();

    // Click Continue
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should move to time selection - use more specific selector
    await expect(page.getByText('When should posts be scheduled?')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI Planner - Time Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Open calendar and AI Planner
    await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /AI Planner|Plan with AI/i }).first().click();
    await expect(page.locator('text=/How many days/i')).toBeVisible({ timeout: 5000 });

    // Navigate through wizard to time selection
    await page.getByRole('button', { name: '7 days' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('text=/posts per day/i')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '1 post' }).first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
  });

  test('should show time selection options', async ({ page }) => {
    // Check for time selection question - use more specific selector
    await expect(page.getByText('When should posts be scheduled?')).toBeVisible({ timeout: 5000 });
  });

  test('should show quick select time buttons', async ({ page }) => {
    // Look for quick select times - use getByRole with regex
    const timeButtons = page.getByRole('button', { name: /AM|PM/ });
    const count = await timeButtons.count();
    expect(count).toBeGreaterThan(0);
  });
});
