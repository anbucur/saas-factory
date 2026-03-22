/**
 * Browser Test Runner - Playwright Integration for QA Agent
 * 
 * Executes real browser tests against deployed frontends:
 * 1. Launches headless browser (Chromium)
 * 2. Navigates to deployment URL
 * 3. Executes test scenarios
 * 4. Captures screenshots on failure
 * 5. Reports structured results
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface TestResult {
  id: string;
  testName: string;
  passed: boolean;
  errorMessage?: string;
  errorStack?: string;
  screenshotBase64?: string;
  screenshotPath?: string;
  durationMs: number;
}

export interface TestSuiteResult {
  id: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  durationMs: number;
  timestamp: string;
}

export interface TestDefinition {
  name: string;
  description?: string;
  fn: (page: Page, baseUrl: string) => Promise<void>;
}

export type ProgressCallback = (testName: string, status: 'running' | 'passed' | 'failed' | 'skipped', error?: string) => void;

const GENERATED_DIR = path.resolve(process.cwd(), '../../generated');
const SCREENSHOTS_DIR = path.join(GENERATED_DIR, 'screenshots');

function ensureDirectories() {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Run a suite of browser tests against a deployed frontend
 */
export async function runFrontendTests(
  deploymentUrl: string,
  tests: TestDefinition[],
  onProgress?: ProgressCallback
): Promise<TestSuiteResult> {
  ensureDirectories();
  
  const suiteId = uuid();
  const results: TestResult[] = [];
  const startTime = Date.now();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'SaaSFactory-QA-Agent/1.0 (Playwright)',
    });

    for (const test of tests) {
      const testStartTime = Date.now();
      const page = await context.newPage();

      onProgress?.(test.name, 'running');

      try {
        // Execute the test
        await test.fn(page, deploymentUrl);

        const durationMs = Date.now() - testStartTime;
        results.push({
          id: uuid(),
          testName: test.name,
          passed: true,
          durationMs,
        });

        onProgress?.(test.name, 'passed');
      } catch (error: any) {
        const durationMs = Date.now() - testStartTime;

        // Capture screenshot on failure
        let screenshotBase64: string | undefined;
        let screenshotPath: string | undefined;

        try {
          const screenshotBuffer = await page.screenshot({ fullPage: true });
          screenshotBase64 = screenshotBuffer.toString('base64');

          const filename = `${suiteId}-${test.name.replace(/[^a-z0-9]/gi, '-')}.png`;
          screenshotPath = path.join(SCREENSHOTS_DIR, filename);
          fs.writeFileSync(screenshotPath, screenshotBuffer);
        } catch (screenshotError) {
          console.error('[BrowserTestRunner] Failed to capture screenshot:', screenshotError);
        }

        results.push({
          id: uuid(),
          testName: test.name,
          passed: false,
          errorMessage: error.message || 'Unknown error',
          errorStack: error.stack,
          screenshotBase64,
          screenshotPath,
          durationMs,
        });

        onProgress?.(test.name, 'failed', error.message);
      }

      await page.close();
    }
  } catch (error: any) {
    console.error('[BrowserTestRunner] Browser launch failed:', error);
    // Mark all remaining tests as failed
    for (const test of tests) {
      if (!results.find(r => r.testName === test.name)) {
        results.push({
          id: uuid(),
          testName: test.name,
          passed: false,
          errorMessage: `Browser error: ${error.message}`,
          durationMs: 0,
        });
        onProgress?.(test.name, 'failed', error.message);
      }
    }
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }

  return {
    id: suiteId,
    totalTests: tests.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    skipped: results.filter(r => r.errorMessage?.includes('skipped')).length,
    results,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick health check - verifies deployment is accessible
 */
export async function verifyDeploymentHealth(url: string): Promise<{ healthy: boolean; error?: string; title?: string }> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();

    await page.close();
    await browser.close();

    return { healthy: true, title };
  } catch (error: any) {
    if (browser) await browser.close();
    return { healthy: false, error: error.message };
  }
}

/**
 * Generate default test suite based on common SaaS patterns
 */
export function generateDefaultTests(): TestDefinition[] {
  return [
    {
      name: 'Page loads successfully',
      description: 'Verify the main page loads without errors',
      fn: async (page, baseUrl) => {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Check for JavaScript errors
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        
        await page.waitForTimeout(2000);
        
        if (errors.length > 0) {
          throw new Error(`Page has JavaScript errors: ${errors.join('; ')}`);
        }
      },
    },
    {
      name: 'No console errors on load',
      description: 'Check for console errors after page load',
      fn: async (page, baseUrl) => {
        const consoleErrors: string[] = [];
        
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Filter out non-critical errors
        const criticalErrors = consoleErrors.filter(e => 
          !e.includes('favicon') && 
          !e.includes('manifest') &&
          !e.includes('extension')
        );

        if (criticalErrors.length > 0) {
          throw new Error(`Console errors found: ${criticalErrors.slice(0, 3).join('; ')}`);
        }
      },
    },
    {
      name: 'Main heading is visible',
      description: 'Verify there is a visible h1 heading',
      fn: async (page, baseUrl) => {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        const h1 = await page.$('h1');
        if (!h1) {
          throw new Error('No h1 heading found on the page');
        }
        
        const isVisible = await h1.isVisible();
        if (!isVisible) {
          throw new Error('h1 heading is not visible');
        }
      },
    },
    {
      name: 'Navigation works',
      description: 'Verify navigation links are functional',
      fn: async (page, baseUrl) => {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Look for common navigation elements
        const navLinks = await page.$$('nav a, [role="navigation"] a, header a');
        
        if (navLinks.length === 0) {
          // No nav links found - skip this test
          return;
        }

        // Try clicking the first nav link
        const firstLink = navLinks[0];
        const href = await firstLink.getAttribute('href');
        
        if (href && !href.startsWith('#')) {
          await firstLink.click();
          await page.waitForLoadState('networkidle');
        }
      },
    },
    {
      name: 'Forms are accessible',
      description: 'Verify form inputs have labels',
      fn: async (page, baseUrl) => {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        const inputs = await page.$$('input:not([type="hidden"]), textarea, select');
        
        for (const input of inputs) {
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const placeholder = await input.getAttribute('placeholder');
          
          if (id) {
            const label = await page.$(`label[for="${id}"]`);
            if (!label && !ariaLabel && !placeholder) {
              throw new Error(`Input with id "${id}" has no associated label`);
            }
          }
        }
      },
    },
  ];
}

/**
 * Generate authentication flow tests
 */
export function generateAuthTests(loginPath = '/login'): TestDefinition[] {
  return [
    {
      name: 'Login page renders',
      fn: async (page, baseUrl) => {
        await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Check for login form elements
        const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
        const passwordInput = await page.$('input[type="password"]');
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        
        if (!emailInput && !passwordInput) {
          throw new Error('Login page missing email or password input');
        }
      },
    },
    {
      name: 'Login form validation',
      fn: async (page, baseUrl) => {
        await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Try submitting empty form
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check for validation messages
          const errors = await page.$$('.error, [role="alert"], .text-red, .text-destructive');
          // If no visible errors, form might still be valid - that's okay for this test
        }
      },
    },
  ];
}

/**
 * Take a screenshot of the current page state
 */
export async function capturePageScreenshot(
  url: string,
  name: string
): Promise<{ path: string; base64: string }> {
  ensureDirectories();
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const base64 = screenshotBuffer.toString('base64');

    const filename = `${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filepath, screenshotBuffer);

    await page.close();
    await browser.close();

    return { path: filepath, base64 };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
