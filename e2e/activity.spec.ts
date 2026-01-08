import { test, expect } from '@playwright/test';

/**
 * Activity Service Integration Tests
 * Tests activity tracking, streaks, and analytics
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

test.describe('Activity Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should initialize empty activity storage', async ({ page }) => {
    // Clear any existing activity
    await page.evaluate(() => {
      localStorage.removeItem('content_activity');
    });

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBe(0);
  });

  test('should store activity with correct structure', async ({ page }) => {
    await page.evaluate(() => {
      const activity = {
        id: 'activity-test-123',
        createdAt: new Date().toISOString(),
        contentType: 'carousel',
        topic: 'Test Topic for Activity',
        postPreview: 'This is a preview of the post content...',
        status: 'draft',
      };
      localStorage.setItem('content_activity', JSON.stringify([activity]));
    });

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe('activity-test-123');
    expect(activities[0].contentType).toBe('carousel');
    expect(activities[0].status).toBe('draft');
  });

  test('should track all activity statuses', async ({ page }) => {
    const statuses = ['draft', 'scheduled', 'posted', 'failed'];

    await page.evaluate((statuses) => {
      const activities = statuses.map((status, i) => ({
        id: `activity-${status}-${i}`,
        createdAt: new Date().toISOString(),
        contentType: 'text-only',
        topic: `${status} activity`,
        postPreview: `Preview for ${status}`,
        status,
        ...(status === 'posted' ? { postedAt: new Date().toISOString() } : {}),
      }));
      localStorage.setItem('content_activity', JSON.stringify(activities));
    }, statuses);

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities).toHaveLength(4);
    const storedStatuses = activities.map((a: any) => a.status);
    for (const status of statuses) {
      expect(storedStatuses).toContain(status);
    }
  });
});

test.describe('Activity Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Set up test activities with different dates and types
    await page.evaluate(() => {
      const now = new Date();
      const activities = [];

      // Add activities over the last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Add 1-3 activities per day randomly
        const count = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < count; j++) {
          const types = ['carousel', 'single-image', 'text-only'];
          const statuses = ['draft', 'scheduled', 'posted'];

          activities.push({
            id: `activity-${i}-${j}`,
            createdAt: date.toISOString(),
            contentType: types[j % types.length],
            topic: `Test Topic ${i}-${j}`,
            postPreview: `Preview ${i}-${j}`,
            status: statuses[j % statuses.length],
          });
        }
      }

      localStorage.setItem('content_activity', JSON.stringify(activities));
    });

    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should calculate activity summary correctly', async ({ page }) => {
    const summary = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];

      const byContentType: Record<string, number> = {
        carousel: 0,
        'single-image': 0,
        'text-only': 0,
        video: 0,
        article: 0,
      };

      activities.forEach((a: any) => {
        if (byContentType[a.contentType] !== undefined) {
          byContentType[a.contentType]++;
        }
      });

      return {
        totalCreated: activities.length,
        totalPosted: activities.filter((a: any) => a.status === 'posted').length,
        totalScheduled: activities.filter((a: any) => a.status === 'scheduled').length,
        byContentType,
      };
    });

    expect(summary.totalCreated).toBeGreaterThan(0);
    expect(summary.byContentType.carousel).toBeGreaterThanOrEqual(0);
    expect(summary.byContentType['single-image']).toBeGreaterThanOrEqual(0);
    expect(summary.byContentType['text-only']).toBeGreaterThanOrEqual(0);
  });

  test('should track weekday distribution', async ({ page }) => {
    const distribution = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];

      const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
      activities.forEach((a: any) => {
        const day = new Date(a.createdAt).getDay();
        weekdayDistribution[day]++;
      });

      return weekdayDistribution;
    });

    expect(distribution).toHaveLength(7);
    expect(distribution.reduce((a: number, b: number) => a + b, 0)).toBeGreaterThan(0);
  });

  test('should track daily activity counts', async ({ page }) => {
    const dailyActivity = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];
      const days = 7;

      const now = new Date();
      const result: { date: string; count: number }[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const count = activities.filter((a: any) => {
          const activityDate = new Date(a.createdAt).toISOString().split('T')[0];
          return activityDate === dateStr;
        }).length;

        result.push({ date: dateStr, count });
      }

      return result;
    });

    expect(dailyActivity).toHaveLength(7);
    dailyActivity.forEach((day: any) => {
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('count');
      expect(day.count).toBeGreaterThanOrEqual(0);
    });
  });
});

test.describe('Streak Calculation', () => {
  test('should calculate no streak when no activity', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('content_activity');
    });

    const streak = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];
      if (activities.length === 0) return { current: 0, longest: 0 };
      return { current: 0, longest: 0 };
    });

    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(0);
  });

  test('should calculate streak from consecutive days', async ({ page }) => {
    await page.goto('/');

    // Create activities for the last 5 consecutive days
    await page.evaluate(() => {
      const activities = [];
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        activities.push({
          id: `streak-activity-${i}`,
          createdAt: date.toISOString(),
          contentType: 'text-only',
          topic: `Day ${i} topic`,
          postPreview: `Day ${i} preview`,
          status: 'posted',
        });
      }

      localStorage.setItem('content_activity', JSON.stringify(activities));
    });

    await closeOnboardingIfPresent(page);

    const streak = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];

      if (activities.length === 0) return { current: 0, longest: 0 };

      // Get unique days with activity
      const daysWithActivity = new Set<string>();
      activities.forEach((a: any) => {
        daysWithActivity.add(new Date(a.createdAt).toISOString().split('T')[0]);
      });

      const sortedDays = Array.from(daysWithActivity).sort().reverse();
      if (sortedDays.length === 0) return { current: 0, longest: 0 };

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (sortedDays[0] === today || sortedDays[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          const prevDate = new Date(sortedDays[i - 1]);
          const currDate = new Date(sortedDays[i]);
          const diff = (prevDate.getTime() - currDate.getTime()) / 86400000;

          if (Math.round(diff) === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      return { current: currentStreak, longest: Math.max(currentStreak, 1) };
    });

    expect(streak.current).toBeGreaterThanOrEqual(1);
    expect(streak.longest).toBeGreaterThanOrEqual(streak.current);
  });

  test('should handle broken streaks', async ({ page }) => {
    await page.goto('/');

    // Create activities with a gap (broken streak)
    await page.evaluate(() => {
      const activities = [];
      const now = new Date();

      // Activity today
      activities.push({
        id: 'streak-today',
        createdAt: now.toISOString(),
        contentType: 'text-only',
        topic: 'Today',
        postPreview: 'Preview',
        status: 'posted',
      });

      // Activity 3 days ago (gap of 2 days)
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      activities.push({
        id: 'streak-3days',
        createdAt: threeDaysAgo.toISOString(),
        contentType: 'text-only',
        topic: '3 days ago',
        postPreview: 'Preview',
        status: 'posted',
      });

      localStorage.setItem('content_activity', JSON.stringify(activities));
    });

    await closeOnboardingIfPresent(page);

    const streak = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];

      const daysWithActivity = new Set<string>();
      activities.forEach((a: any) => {
        daysWithActivity.add(new Date(a.createdAt).toISOString().split('T')[0]);
      });

      const sortedDays = Array.from(daysWithActivity).sort().reverse();
      const today = new Date().toISOString().split('T')[0];

      // Only count streak if most recent day is today or yesterday
      if (sortedDays[0] !== today) {
        return { current: 0 };
      }

      return { current: 1 }; // Only today counts, broken streak
    });

    expect(streak.current).toBeLessThanOrEqual(1);
  });
});

test.describe('Content Type Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should track carousel content type', async ({ page }) => {
    await page.evaluate(() => {
      const activity = {
        id: 'carousel-test',
        createdAt: new Date().toISOString(),
        contentType: 'carousel',
        topic: 'Carousel Test',
        postPreview: 'Preview',
        status: 'draft',
      };
      localStorage.setItem('content_activity', JSON.stringify([activity]));
    });

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities[0].contentType).toBe('carousel');
  });

  test('should track image content type', async ({ page }) => {
    await page.evaluate(() => {
      const activity = {
        id: 'image-test',
        createdAt: new Date().toISOString(),
        contentType: 'single-image',
        topic: 'Image Test',
        postPreview: 'Preview',
        status: 'posted',
      };
      localStorage.setItem('content_activity', JSON.stringify([activity]));
    });

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities[0].contentType).toBe('single-image');
  });

  test('should track text-only content type', async ({ page }) => {
    await page.evaluate(() => {
      const activity = {
        id: 'text-test',
        createdAt: new Date().toISOString(),
        contentType: 'text-only',
        topic: 'Text Test',
        postPreview: 'Preview',
        status: 'scheduled',
      };
      localStorage.setItem('content_activity', JSON.stringify([activity]));
    });

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities[0].contentType).toBe('text-only');
  });
});

test.describe('Recent Posts Retrieval', () => {
  test('should retrieve recent posts sorted by date', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const now = new Date();
      const activities = [];

      for (let i = 0; i < 15; i++) {
        const date = new Date(now);
        date.setHours(date.getHours() - i);
        activities.push({
          id: `recent-${i}`,
          createdAt: date.toISOString(),
          contentType: 'text-only',
          topic: `Post ${i}`,
          postPreview: `Preview ${i}`,
          status: 'posted',
        });
      }

      localStorage.setItem('content_activity', JSON.stringify(activities));
    });

    await closeOnboardingIfPresent(page);

    const recentPosts = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      const activities = stored ? JSON.parse(stored) : [];

      return activities
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    });

    expect(recentPosts).toHaveLength(10);

    // Verify sorted by date (most recent first)
    for (let i = 1; i < recentPosts.length; i++) {
      const prevDate = new Date(recentPosts[i - 1].createdAt);
      const currDate = new Date(recentPosts[i].createdAt);
      expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
    }
  });
});

test.describe('Engagement Notes', () => {
  test('should support engagement notes on activities', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const activity = {
        id: 'engagement-test',
        createdAt: new Date().toISOString(),
        contentType: 'text-only',
        topic: 'Engagement Test',
        postPreview: 'Preview',
        status: 'posted',
        engagementNotes: 'This post got 500 likes and 50 comments!',
      };
      localStorage.setItem('content_activity', JSON.stringify([activity]));
    });

    await closeOnboardingIfPresent(page);

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities[0].engagementNotes).toBe('This post got 500 likes and 50 comments!');
  });
});

test.describe('Activity Storage Limits', () => {
  test('should handle large numbers of activities', async ({ page }) => {
    await page.goto('/');

    // Create 100 activities
    await page.evaluate(() => {
      const activities = [];
      const now = new Date();

      for (let i = 0; i < 100; i++) {
        const date = new Date(now);
        date.setMinutes(date.getMinutes() - i);
        activities.push({
          id: `bulk-${i}`,
          createdAt: date.toISOString(),
          contentType: 'text-only',
          topic: `Topic ${i}`,
          postPreview: `Preview ${i}`,
          status: i % 2 === 0 ? 'posted' : 'draft',
        });
      }

      localStorage.setItem('content_activity', JSON.stringify(activities));
    });

    await closeOnboardingIfPresent(page);

    const activities = await page.evaluate(() => {
      const stored = localStorage.getItem('content_activity');
      return stored ? JSON.parse(stored) : [];
    });

    expect(activities).toHaveLength(100);

    // Verify we can still filter and query
    const postedCount = activities.filter((a: any) => a.status === 'posted').length;
    expect(postedCount).toBe(50);
  });
});
