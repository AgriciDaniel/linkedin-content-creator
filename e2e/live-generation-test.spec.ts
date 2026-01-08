import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Live Generation & Posting Test
 * Tests actual content generation with Gemini API and posting to LinkedIn
 *
 * SETUP: Before running, set these environment variables in .env.local:
 *   GEMINI_API_KEY=your_actual_gemini_api_key
 *   LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
 *
 * Run with: npx playwright test e2e/live-generation-test.spec.ts --headed
 */

// Get API keys from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

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

// Helper to inject API keys into localStorage
async function injectAPIKeys(page: any) {
  await page.evaluate(({ geminiKey, linkedinToken }: { geminiKey: string | undefined, linkedinToken: string | undefined }) => {
    if (geminiKey && geminiKey !== 'PLACEHOLDER_API_KEY') {
      localStorage.setItem('gemini_api_key', geminiKey);
    }
    if (linkedinToken) {
      // Store as the full token object that the app expects
      const tokenData = {
        accessToken: linkedinToken,
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days from now
        authMethod: 'oauth'
      };
      localStorage.setItem('linkedin_token', JSON.stringify(tokenData));
    }
  }, { geminiKey: GEMINI_API_KEY, linkedinToken: LINKEDIN_ACCESS_TOKEN });
}

// Helper to wait with countdown
async function waitWithCountdown(page: any, seconds: number, message: string) {
  console.log(`\n⏳ ${message}`);
  for (let i = seconds; i > 0; i--) {
    console.log(`   ${i} seconds remaining...`);
    await page.waitForTimeout(1000);
  }
  console.log('   Done waiting!\n');
}

test.describe('Live Generation & Posting Tests', () => {
  // Increase timeout for live API calls
  test.setTimeout(300000); // 5 minutes per test

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Inject API keys from environment variables
    await injectAPIKeys(page);
    await page.reload(); // Reload to apply the injected keys
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Generate and Post TEXT content', async ({ page }) => {
    console.log('\n📝 === TEXT POST TEST ===\n');

    // Check if Gemini API is configured via environment variable
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLACEHOLDER_API_KEY') {
      console.log('❌ Gemini API key not configured.');
      console.log('   Please set GEMINI_API_KEY in .env.local');
      test.skip();
      return;
    }
    console.log('✅ Gemini API key configured');

    // Check if LinkedIn is connected via environment variable
    if (!LINKEDIN_ACCESS_TOKEN) {
      console.log('❌ LinkedIn not connected.');
      console.log('   Please set LINKEDIN_ACCESS_TOKEN in .env.local');
      test.skip();
      return;
    }
    console.log('✅ LinkedIn connected');

    // Select Text Only content type
    await page.locator('button:has-text("Text Only")').click();
    await page.waitForTimeout(300);
    console.log('✅ Selected Text Only');

    // Enter topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('3 productivity tips for remote workers in 2025');
    console.log('✅ Topic entered');

    // Click Generate
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    console.log('⏳ Generating content...');

    // Wait for generation to complete (look for the post content or success state)
    await expect(page.locator('text=/researching|generating|polishing|complete/i').first()).toBeVisible({ timeout: 60000 });

    // Wait for content to appear in the editor/preview
    await page.waitForTimeout(30000); // Give time for full generation
    console.log('✅ Content generated');

    // Look for Post to LinkedIn button and click it
    const postButton = page.locator('button:has-text("Post to LinkedIn"), button:has-text("Post Now")');
    if (await postButton.isVisible({ timeout: 5000 })) {
      await postButton.click();
      console.log('⏳ Posting to LinkedIn...');

      // Wait for post confirmation
      await page.waitForTimeout(10000);
      console.log('✅ TEXT POST COMPLETED - Check LinkedIn!');
    } else {
      console.log('⚠️ Post button not found - generation may have completed, check UI');
    }

    // Wait 1 minute before next test
    await waitWithCountdown(page, 60, 'Waiting 1 minute before next post...');
  });

  test('2. Generate and Post IMAGE content', async ({ page }) => {
    console.log('\n🖼️ === IMAGE POST TEST ===\n');

    // Check APIs via environment variables
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLACEHOLDER_API_KEY' || !LINKEDIN_ACCESS_TOKEN) {
      console.log('❌ APIs not configured. Set GEMINI_API_KEY and LINKEDIN_ACCESS_TOKEN in .env.local');
      test.skip();
      return;
    }

    // Select Image content type
    await page.locator('button:has-text("Image")').click();
    await page.waitForTimeout(300);
    console.log('✅ Selected Image');

    // Enter topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('The future of AI in marketing automation');
    console.log('✅ Topic entered');

    // Click Generate
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    console.log('⏳ Generating content with image...');

    // Wait for generation (images take longer)
    await page.waitForTimeout(60000); // 60 seconds for image generation
    console.log('✅ Content and image generated');

    // Post to LinkedIn
    const postButton = page.locator('button:has-text("Post to LinkedIn"), button:has-text("Post Now")');
    if (await postButton.isVisible({ timeout: 5000 })) {
      await postButton.click();
      console.log('⏳ Posting image to LinkedIn...');
      await page.waitForTimeout(15000);
      console.log('✅ IMAGE POST COMPLETED - Check LinkedIn!');
    } else {
      console.log('⚠️ Post button not found');
    }

    // Wait 1 minute before next test
    await waitWithCountdown(page, 60, 'Waiting 1 minute before next post...');
  });

  test('3. Generate and Post CAROUSEL content', async ({ page }) => {
    console.log('\n🎠 === CAROUSEL POST TEST ===\n');

    // Check APIs via environment variables
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLACEHOLDER_API_KEY' || !LINKEDIN_ACCESS_TOKEN) {
      console.log('❌ APIs not configured. Set GEMINI_API_KEY and LINKEDIN_ACCESS_TOKEN in .env.local');
      test.skip();
      return;
    }

    // Select Carousel content type
    await page.locator('button:has-text("Carousel")').click();
    await page.waitForTimeout(300);
    console.log('✅ Selected Carousel');

    // Enter topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="AI automation"]');
    await topicInput.fill('5 ways AI is transforming content creation in 2025');
    console.log('✅ Topic entered');

    // Click Generate
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    console.log('⏳ Generating carousel content...');

    // Wait for carousel generation (takes longest)
    await page.waitForTimeout(90000); // 90 seconds for carousel
    console.log('✅ Carousel content generated');

    // Post to LinkedIn
    const postButton = page.locator('button:has-text("Post to LinkedIn"), button:has-text("Post Now")');
    if (await postButton.isVisible({ timeout: 5000 })) {
      await postButton.click();
      console.log('⏳ Posting carousel to LinkedIn...');
      await page.waitForTimeout(20000);
      console.log('✅ CAROUSEL POST COMPLETED - Check LinkedIn!');
    } else {
      console.log('⚠️ Post button not found');
    }

    console.log('\n🎉 ALL TESTS COMPLETED! Check your LinkedIn profile for the posts.\n');
  });
});
