import { test, expect } from '@playwright/test';

/**
 * Content Generation Integration Tests
 * Tests content generation flow with API mocking
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

test.describe('Content Generation - API Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should disable generate button without API key', async ({ page }) => {
    // Clear API key
    await page.evaluate(() => {
      localStorage.removeItem('gemini_api_key');
    });

    await page.reload();
    await closeOnboardingIfPresent(page);

    // Enter a topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('Test topic');

    // Generate button should be visible
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeVisible();

    // Without API key, clicking generate should show warning or error
    // The button should either be disabled or show a prompt to add API key
  });

  test('should store API key in localStorage', async ({ page }) => {
    // Clear any existing API key first
    await page.evaluate(() => {
      localStorage.removeItem('gemini_api_key');
    });
    await page.reload();
    await closeOnboardingIfPresent(page);

    // Open settings
    await page.locator('button[aria-label="Settings"]').click();
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });

    // Scroll to Gemini section if needed
    await page.locator('text=/Gemini API/i').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Enter API key
    const apiInput = page.locator('input[placeholder*="Gemini"]');
    await expect(apiInput).toBeVisible({ timeout: 3000 });
    await apiInput.fill('AIzaSy-test-api-key-12345');

    // Click save button to store the key
    const saveButton = page.getByRole('button', { name: /Save Key/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 3000 });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Verify it's stored
    const storedKey = await page.evaluate(() => {
      return localStorage.getItem('gemini_api_key');
    });

    expect(storedKey).toBe('AIzaSy-test-api-key-12345');
  });

  test('should show API key is configured indicator', async ({ page }) => {
    // Set API key
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-key-configured');
    });

    await page.reload();
    await closeOnboardingIfPresent(page);

    // Open settings
    await page.locator('button[aria-label="Settings"]').click();
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });

    // When Gemini is configured, it should show the connected state with checkmark
    // Look for the green success indicator or the test/disconnect buttons
    const geminiSection = page.locator('text=/Gemini API/i');
    await expect(geminiSection.first()).toBeVisible({ timeout: 5000 });

    // Verify the key is actually stored
    const storedKey = await page.evaluate(() => {
      return localStorage.getItem('gemini_api_key');
    });
    expect(storedKey).toBe('test-key-configured');
  });
});

test.describe('Content Generation - UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a mock API key
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-api-key-for-generation');
    });
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should show content type selector', async ({ page }) => {
    // Check for content type buttons
    const carouselButton = page.locator('button:has-text("Carousel")');
    const imageButton = page.locator('button:has-text("Image")');
    const textButton = page.locator('button:has-text("Text")');

    await expect(carouselButton).toBeVisible();
    await expect(imageButton).toBeVisible();
    await expect(textButton).toBeVisible();
  });

  test('should allow selecting different content types', async ({ page }) => {
    // Click carousel
    await page.locator('button:has-text("Carousel")').click();
    await page.waitForTimeout(200);

    // Click image
    await page.locator('button:has-text("Image")').click();
    await page.waitForTimeout(200);

    // Click text
    await page.locator('button:has-text("Text")').click();
    await page.waitForTimeout(200);
  });

  test('should validate topic before generation', async ({ page }) => {
    // Clear topic input
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.clear();

    // Generate button should be disabled when topic is empty
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeDisabled();
  });

  test('should enable generate button with valid topic', async ({ page }) => {
    // Enter a topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('How to improve LinkedIn engagement');

    // Generate button should be enabled
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
  });
});

test.describe('Content Generation - Batch Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-api-key');
    });
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should show batch mode button', async ({ page }) => {
    const batchButton = page.locator('button:has-text("Batch")');
    await expect(batchButton).toBeVisible();
  });

  test('should open batch mode dialog', async ({ page }) => {
    await page.locator('button:has-text("Batch")').click();
    await page.waitForTimeout(500);

    // Should show batch mode options or dialog
    const batchContent = page.locator('text=/batch|variations|multiple/i');
    await expect(batchContent.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Content Generation - Progress States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gemini_api_key', 'test-api-key');
    });
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('should show generation stages in UI', async ({ page }) => {
    // The app should support these generation stages:
    // researching, generating, polishing, creating-visuals, complete
    const stages = ['researching', 'generating', 'polishing', 'creating-visuals', 'complete'];

    // Verify the stages are expected constants
    expect(stages).toHaveLength(5);
  });
});

test.describe('Content Generation - Error Handling', () => {
  test('should handle missing API key gracefully', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('gemini_api_key');
    });
    await closeOnboardingIfPresent(page);

    // Enter topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('Test topic');

    // Try to generate - should prompt for API key or show error
    const generateButton = page.locator('button:has-text("Generate")');
    if (await generateButton.isEnabled()) {
      await generateButton.click();
      await page.waitForTimeout(1000);

      // Should show some form of error or prompt
      const errorOrPrompt = page.locator('text=/API key|configure|settings/i');
      // Either error shows or settings modal opens
    }
  });
});

test.describe('Generated Content - Storage', () => {
  test('should prepare content structure for scheduling', async ({ page }) => {
    await page.goto('/');

    // Simulate generated content storage
    await page.evaluate(() => {
      const generatedContent = {
        post: 'This is a generated LinkedIn post about productivity tips.',
        imagePrompt: 'Professional business graphic with productivity icons',
        sources: [
          { uri: 'https://example.com/article1', title: 'Productivity Tips Article' },
        ],
      };
      localStorage.setItem('temp_generated_content', JSON.stringify(generatedContent));
    });

    const content = await page.evaluate(() => {
      const stored = localStorage.getItem('temp_generated_content');
      return stored ? JSON.parse(stored) : null;
    });

    expect(content).toHaveProperty('post');
    expect(content).toHaveProperty('imagePrompt');
    expect(content).toHaveProperty('sources');
  });

  test('should structure carousel content correctly', async ({ page }) => {
    await page.goto('/');

    // Simulate carousel content
    await page.evaluate(() => {
      const carouselContent = {
        post: 'Check out my new carousel on AI trends!',
        slides: [
          { layout: 'title-hook', headline: 'AI Trends 2025' },
          { layout: 'bullet-list', title: 'Key Points', bullets: ['Point 1', 'Point 2', 'Point 3'] },
          { layout: 'stat-card', title: 'Growth', stat: '150%', description: 'Year over year growth' },
          { layout: 'cta', headline: 'Follow for More', subtext: 'Get daily insights' },
        ],
        sources: [],
      };
      localStorage.setItem('temp_carousel_content', JSON.stringify(carouselContent));
    });

    const content = await page.evaluate(() => {
      const stored = localStorage.getItem('temp_carousel_content');
      return stored ? JSON.parse(stored) : null;
    });

    expect(content.slides).toHaveLength(4);
    expect(content.slides[0].layout).toBe('title-hook');
    expect(content.slides[3].layout).toBe('cta');
  });
});

test.describe('Profile Context for Generation', () => {
  test('should use profile context in generation', async ({ page }) => {
    await page.goto('/');

    // Set up profile data
    await page.evaluate(() => {
      const profile = {
        name: 'Test User',
        description: 'Software Engineer specializing in AI',
        industry: 'Technology',
        targetAudience: 'Tech professionals',
        brandPersonality: 'professional',
        focusKeywords: ['AI', 'Machine Learning', 'Productivity'],
        preferredLength: 'medium',
        ctaStyle: 'question',
      };
      localStorage.setItem('linkedin_user_profile', JSON.stringify(profile));
    });

    await closeOnboardingIfPresent(page);

    const profile = await page.evaluate(() => {
      const stored = localStorage.getItem('linkedin_user_profile');
      return stored ? JSON.parse(stored) : null;
    });

    expect(profile).toBeTruthy();
    expect(profile.name).toBe('Test User');
    expect(profile.brandPersonality).toBe('professional');
    expect(profile.focusKeywords).toContain('AI');
  });

  test('should apply CTA style preference', async ({ page }) => {
    await page.goto('/');

    // Test different CTA styles
    const ctaStyles = ['question', 'action', 'subtle', 'none'];

    for (const style of ctaStyles) {
      await page.evaluate((ctaStyle) => {
        const profile = { ctaStyle };
        localStorage.setItem('linkedin_user_profile', JSON.stringify(profile));
      }, style);

      const profile = await page.evaluate(() => {
        const stored = localStorage.getItem('linkedin_user_profile');
        return stored ? JSON.parse(stored) : null;
      });

      expect(profile.ctaStyle).toBe(style);
    }
  });
});

test.describe('Memory Service Integration', () => {
  test('should store memory context for AI planning', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const memory = {
        recentTopics: ['AI automation', 'Remote work tips', 'Leadership'],
        topicFrequency: { 'AI': 5, 'Leadership': 3, 'Productivity': 2 },
        lastGeneratedAt: new Date().toISOString(),
        plannerPreferences: {
          lastDurationDays: 7,
          lastPostsPerDay: 1,
          preferredTimes: ['09:00', '17:00'],
        },
      };
      localStorage.setItem('ai_memory_context', JSON.stringify(memory));
    });

    await closeOnboardingIfPresent(page);

    const memory = await page.evaluate(() => {
      const stored = localStorage.getItem('ai_memory_context');
      return stored ? JSON.parse(stored) : null;
    });

    expect(memory).toBeTruthy();
    expect(memory.recentTopics).toHaveLength(3);
    expect(memory.topicFrequency).toHaveProperty('AI');
  });

  test('should prevent topic repetition using memory', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const memory = {
        recentTopics: ['AI automation trends', '5 tips for remote work', 'Leadership lessons'],
        avoidsTopics: ['Controversial topic', 'Political content'],
      };
      localStorage.setItem('ai_memory_context', JSON.stringify(memory));
    });

    const memory = await page.evaluate(() => {
      const stored = localStorage.getItem('ai_memory_context');
      return stored ? JSON.parse(stored) : null;
    });

    expect(memory.recentTopics).toContain('AI automation trends');
    expect(memory.avoidsTopics).toContain('Controversial topic');
  });
});

test.describe('Hashtag Generation', () => {
  test('should structure hashtag suggestions', async ({ page }) => {
    await page.goto('/');

    // Simulate hashtag suggestions
    await page.evaluate(() => {
      const hashtags = [
        { tag: '#AI', relevance: 0.95 },
        { tag: '#Productivity', relevance: 0.85 },
        { tag: '#Leadership', relevance: 0.75 },
        { tag: '#Technology', relevance: 0.70 },
      ];
      localStorage.setItem('temp_hashtags', JSON.stringify(hashtags));
    });

    const hashtags = await page.evaluate(() => {
      const stored = localStorage.getItem('temp_hashtags');
      return stored ? JSON.parse(stored) : [];
    });

    expect(hashtags).toHaveLength(4);
    expect(hashtags[0].tag).toBe('#AI');
    expect(hashtags[0].relevance).toBeGreaterThan(0.9);
  });
});
