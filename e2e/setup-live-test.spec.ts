import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup Script for Live Generation Tests
 *
 * This script helps you configure your API keys for live testing:
 * 1. Run with: npx playwright test e2e/setup-live-test.spec.ts --headed
 * 2. Configure your Gemini API key and connect LinkedIn in the app
 * 3. Click in the terminal and press Enter when done
 * 4. The script will export your keys to .env.local
 * 5. Then run: npx playwright test e2e/live-generation-test.spec.ts --headed
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

test.describe('Live Test Setup', () => {
  test.setTimeout(600000); // 10 minutes for manual configuration

  test('Configure APIs and export to .env.local', async ({ page, context }) => {
    console.log('\n🔧 === LIVE TEST SETUP ===\n');
    console.log('This script will help you configure your APIs for live testing.\n');

    // Try to load existing storage state
    const storagePath = path.join(__dirname, '..', '.auth', 'storage-state.json');
    const authDir = path.join(__dirname, '..', '.auth');

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await page.goto('/');
    await closeOnboardingIfPresent(page);
    await expect(page.locator('h1:has-text("Content Creator")')).toBeVisible({ timeout: 10000 });

    // Check current API status
    let geminiKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    let linkedinToken = await page.evaluate(() => localStorage.getItem('linkedin_access_token'));

    console.log('Current API Status:');
    console.log(`  Gemini API Key: ${geminiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  LinkedIn Token: ${linkedinToken ? '✅ Connected' : '❌ Not connected'}`);
    console.log('');

    if (geminiKey && linkedinToken) {
      console.log('✅ Both APIs are already configured!\n');
    } else {
      // Open settings for manual configuration
      console.log('📋 Opening Settings panel...');
      console.log('   Please configure your APIs in the browser window.\n');

      await page.locator('button[aria-label="Settings"]').click();
      await page.waitForTimeout(500);

      if (!geminiKey) {
        console.log('📝 STEP 1: Enter your Gemini API key');
        console.log('   - Find the "Gemini API" section');
        console.log('   - Enter your key (get one at https://makersuite.google.com/app/apikey)');
        console.log('   - Click "Save Key"\n');
      }

      if (!linkedinToken) {
        console.log('📝 STEP 2: Connect LinkedIn');
        console.log('   - Find the "LinkedIn Integration" section');
        console.log('   - Click "Connect LinkedIn"');
        console.log('   - Complete the OAuth login in the popup\n');
      }

      console.log('🔄 The Playwright Inspector will open.');
      console.log('   Configure your APIs in the browser window, then click "Resume" in the Inspector.\n');
      console.log('   TIP: Copy your keys from your main browser\'s DevTools:');
      console.log('   F12 > Application > Local Storage > localhost:5000\n');

      // Pause to let user configure APIs manually
      await page.pause();

      // Re-check after pause
      geminiKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
      linkedinToken = await page.evaluate(() => localStorage.getItem('linkedin_access_token'));

      if (geminiKey && linkedinToken) {
        console.log('\n✅ Both APIs detected as configured!\n');
      }
    }

    // Final check
    geminiKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    linkedinToken = await page.evaluate(() => localStorage.getItem('linkedin_access_token'));

    if (!geminiKey || !linkedinToken) {
      console.log('\n⚠️  Not all APIs are configured.');
      console.log('   You can still run live tests if you configure them manually.\n');
    }

    // Save storage state for future tests
    await context.storageState({ path: storagePath });
    console.log('💾 Browser state saved to .auth/storage-state.json\n');

    // Export to .env.local
    const envContent = `# Live Test Configuration (auto-generated)
# Generated at: ${new Date().toISOString()}
#
# These keys were exported from the browser session.
# You can also set them manually.

GEMINI_API_KEY=${geminiKey || 'PLACEHOLDER_API_KEY'}
LINKEDIN_ACCESS_TOKEN=${linkedinToken || ''}
`;

    const envPath = path.join(__dirname, '..', '.env.local');
    fs.writeFileSync(envPath, envContent);

    console.log('📄 API keys exported to .env.local\n');

    if (geminiKey && linkedinToken) {
      console.log('✅ Setup complete! You can now run the live tests:');
      console.log('   npx playwright test e2e/live-generation-test.spec.ts --headed\n');
    } else {
      console.log('⚠️  Setup incomplete. Missing APIs:');
      if (!geminiKey) console.log('   - GEMINI_API_KEY');
      if (!linkedinToken) console.log('   - LINKEDIN_ACCESS_TOKEN');
      console.log('\nTo complete setup, either:');
      console.log('1. Run this script again and configure APIs in the browser, OR');
      console.log('2. Manually edit .env.local with your API keys\n');
    }

    // Don't fail - just report status
    if (geminiKey && linkedinToken) {
      expect(true).toBe(true); // Pass
    } else {
      console.log('⚠️  Test completing without all APIs configured.');
      console.log('   You can manually edit .env.local or run setup again.\n');
    }
  });
});
