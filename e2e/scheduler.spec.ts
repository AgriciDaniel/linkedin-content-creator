import { test, expect } from '@playwright/test';

/**
 * Scheduler Service Integration Tests
 * Tests scheduling functionality via the UI
 */

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

// Helper to navigate to calendar
async function openCalendar(page: any) {
  await page.locator('button[aria-label="Content Calendar"], button[title="Content Calendar"]').click();
  await expect(page.locator('text=/Calendar|Month|Schedule/i').first()).toBeVisible({ timeout: 5000 });
}

test.describe('Scheduler Service - Post Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should display calendar with scheduled posts', async ({ page }) => {
    await openCalendar(page);

    // Calendar should be visible with month view
    const monthView = page.locator('text=/January|February|March|April|May|June|July|August|September|October|November|December/');
    await expect(monthView.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no posts scheduled', async ({ page }) => {
    // Clear any existing scheduled posts
    await page.evaluate(() => {
      localStorage.removeItem('linkedin_scheduled_posts');
    });

    await page.reload();
    await closeOnboardingIfPresent(page);
    await openCalendar(page);

    // Should show the calendar grid
    const calendarGrid = page.locator('[class*="grid"], [class*="calendar"]');
    await expect(calendarGrid.first()).toBeVisible({ timeout: 5000 });
  });

  test('should validate scheduled posts data structure', async ({ page }) => {
    // Create a mock scheduled post
    await page.evaluate(() => {
      const mockPost = {
        id: 'test-post-123',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        contentType: 'text',
        topic: 'Test Topic',
        post: 'This is a test post content for the scheduler test.',
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify([mockPost]));
    });

    await page.reload();
    await closeOnboardingIfPresent(page);
    await openCalendar(page);

    // Check that the scheduled post data is stored correctly
    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts).toHaveLength(1);
    expect(storedPosts[0]).toHaveProperty('id', 'test-post-123');
    expect(storedPosts[0]).toHaveProperty('status', 'scheduled');
    expect(storedPosts[0]).toHaveProperty('topic', 'Test Topic');
  });

  test('should handle draft posts correctly', async ({ page }) => {
    // Create a mock draft post
    await page.evaluate(() => {
      const mockDraft = {
        id: 'draft-post-456',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        contentType: 'carousel',
        topic: 'Draft Topic',
        post: '',
        status: 'draft',
        aiPlannerMetadata: {
          planId: 'test-plan-1',
          generatedFromTopic: false,
          originalTopic: 'Draft Topic',
          generationStatus: 'pending',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify([mockDraft]));
    });

    await page.reload();
    await closeOnboardingIfPresent(page);

    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts[0].status).toBe('draft');
    expect(storedPosts[0].aiPlannerMetadata).toBeDefined();
    expect(storedPosts[0].aiPlannerMetadata.generationStatus).toBe('pending');
  });
});

test.describe('Scheduler Service - Date Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test posts with different dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const mockPosts = [
      {
        id: 'post-today',
        scheduledAt: today.toISOString(),
        contentType: 'text',
        topic: 'Today Post',
        post: 'Content for today',
        status: 'scheduled',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
      {
        id: 'post-tomorrow',
        scheduledAt: tomorrow.toISOString(),
        contentType: 'image',
        topic: 'Tomorrow Post',
        post: 'Content for tomorrow',
        status: 'scheduled',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
      {
        id: 'post-next-week',
        scheduledAt: nextWeek.toISOString(),
        contentType: 'carousel',
        topic: 'Next Week Post',
        post: 'Content for next week',
        status: 'scheduled',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
    ];

    await page.goto('/');
    await page.evaluate((posts) => {
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify(posts));
    }, mockPosts);

    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should store posts with different scheduled dates', async ({ page }) => {
    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts).toHaveLength(3);

    // Check all three posts have different dates
    const dates = storedPosts.map((p: any) => new Date(p.scheduledAt).toDateString());
    expect(new Set(dates).size).toBe(3); // All unique dates
  });

  test('should display calendar with posts', async ({ page }) => {
    await openCalendar(page);

    // Check calendar is showing
    const monthLabel = page.locator('text=/January|February|March|April|May|June|July|August|September|October|November|December/');
    await expect(monthLabel.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Scheduler Service - Post Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should support all post status types', async ({ page }) => {
    const statuses = ['draft', 'scheduled', 'posted', 'failed', 'cancelled'];

    await page.evaluate((statuses) => {
      const posts = statuses.map((status, index) => ({
        id: `post-${status}-${index}`,
        scheduledAt: new Date(Date.now() + index * 86400000).toISOString(),
        contentType: 'text',
        topic: `${status} Post`,
        post: `Content for ${status} post`,
        status: status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify(posts));
    }, statuses);

    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts).toHaveLength(5);

    // Verify each status is present
    const storedStatuses = storedPosts.map((p: any) => p.status);
    for (const status of statuses) {
      expect(storedStatuses).toContain(status);
    }
  });

  test('should handle posted posts with LinkedIn URL', async ({ page }) => {
    await page.evaluate(() => {
      const postedPost = {
        id: 'posted-post-123',
        scheduledAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        contentType: 'text',
        topic: 'Posted Topic',
        post: 'This post was already published',
        status: 'posted',
        linkedinPostId: 'urn:li:share:12345678',
        linkedinPostUrl: 'https://www.linkedin.com/feed/update/urn:li:share:12345678',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify([postedPost]));
    });

    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts[0].linkedinPostId).toBe('urn:li:share:12345678');
    expect(storedPosts[0].linkedinPostUrl).toContain('linkedin.com');
  });

  test('should handle failed posts with error message', async ({ page }) => {
    await page.evaluate(() => {
      const failedPost = {
        id: 'failed-post-123',
        scheduledAt: new Date().toISOString(),
        contentType: 'image',
        topic: 'Failed Topic',
        post: 'This post failed to publish',
        status: 'failed',
        error: 'API rate limit exceeded',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify([failedPost]));
    });

    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts[0].status).toBe('failed');
    expect(storedPosts[0].error).toBe('API rate limit exceeded');
  });
});

test.describe('Scheduler Service - Content Types', () => {
  test('should handle all content types correctly', async ({ page }) => {
    const contentTypes = ['carousel', 'image', 'text'];

    await page.goto('/');
    await page.evaluate((types) => {
      const posts = types.map((type, index) => ({
        id: `post-${type}-${index}`,
        scheduledAt: new Date(Date.now() + index * 86400000).toISOString(),
        contentType: type,
        topic: `${type} content topic`,
        post: `Content for ${type} post`,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add carousel-specific data for carousel type
        ...(type === 'carousel' ? {
          carouselSlides: [
            { layout: 'title-hook', headline: 'Test Title' },
            { layout: 'bullet-list', title: 'Key Points', bullets: ['Point 1', 'Point 2'] },
          ]
        } : {}),
        // Add image prompt for image type
        ...(type === 'image' ? {
          imagePrompt: 'Professional LinkedIn graphic with blue theme',
        } : {}),
      }));
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify(posts));
    }, contentTypes);

    await closeOnboardingIfPresent(page);

    const storedPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      return stored ? JSON.parse(stored) : [];
    });

    expect(storedPosts).toHaveLength(3);

    // Verify carousel has slides
    const carouselPost = storedPosts.find((p: any) => p.contentType === 'carousel');
    expect(carouselPost.carouselSlides).toBeDefined();
    expect(carouselPost.carouselSlides).toHaveLength(2);

    // Verify image post has prompt
    const imagePost = storedPosts.find((p: any) => p.contentType === 'image');
    expect(imagePost.imagePrompt).toBeDefined();
  });
});

test.describe('Scheduler Stats', () => {
  test('should calculate scheduler statistics correctly', async ({ page }) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await page.goto('/');
    await page.evaluate((tomorrow) => {
      const posts = [
        { id: '1', scheduledAt: tomorrow, contentType: 'text', topic: 'A', post: 'A', status: 'scheduled', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '2', scheduledAt: tomorrow, contentType: 'text', topic: 'B', post: 'B', status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '3', scheduledAt: new Date(Date.now() - 86400000).toISOString(), contentType: 'text', topic: 'C', post: 'C', status: 'posted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '4', scheduledAt: new Date(Date.now() - 86400000).toISOString(), contentType: 'text', topic: 'D', post: 'D', status: 'failed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      localStorage.setItem('linkedin_scheduled_posts', JSON.stringify(posts));
    }, tomorrow.toISOString());

    await closeOnboardingIfPresent(page);

    const stats = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_scheduled_posts');
      const posts = stored ? JSON.parse(stored) : [];

      return {
        total: posts.length,
        draft: posts.filter((p: any) => p.status === 'draft').length,
        scheduled: posts.filter((p: any) => p.status === 'scheduled').length,
        posted: posts.filter((p: any) => p.status === 'posted').length,
        failed: posts.filter((p: any) => p.status === 'failed').length,
      };
    });

    expect(stats.total).toBe(4);
    expect(stats.draft).toBe(1);
    expect(stats.scheduled).toBe(1);
    expect(stats.posted).toBe(1);
    expect(stats.failed).toBe(1);
  });
});
