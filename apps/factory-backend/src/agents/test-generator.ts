/**
 * Test Generator - AI-Powered Playwright Test Generation
 * 
 * Generates Playwright test files by:
 * 1. Analyzing frontend code structure
 * 2. Extracting component patterns and routes
 * 3. Using LLM to generate appropriate test scenarios
 * 4. Writing test files that can be executed by browser-test-runner
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { callLLM } from './llm.js';
import type { TestDefinition } from './browser-test-runner.js';

const GENERATED_DIR = path.resolve(process.cwd(), '../../generated');
const TESTS_DIR = path.join(GENERATED_DIR, 'tests');

interface FrontendAnalysis {
  routes: string[];
  components: string[];
  forms: FormInfo[];
  authRelated: boolean;
  mainFeatures: string[];
}

interface FormInfo {
  name: string;
  inputs: string[];
  submitButton: string;
}

interface GeneratedTestFile {
  name: string;
  content: string;
  tests: TestDefinition[];
}

function ensureTestDirectory(projectName: string): string {
  const projectTestDir = path.join(TESTS_DIR, projectName.replace(/[^a-z0-9]/gi, '-'));
  if (!fs.existsSync(projectTestDir)) {
    fs.mkdirSync(projectTestDir, { recursive: true });
  }
  return projectTestDir;
}

/**
 * Analyze frontend code to extract testable patterns
 */
export async function analyzeFrontendCode(projectDir: string): Promise<FrontendAnalysis> {
  const analysis: FrontendAnalysis = {
    routes: [],
    components: [],
    forms: [],
    authRelated: false,
    mainFeatures: [],
  };

  // Look for route definitions
  const routePatterns = [
    /path:\s*['"`]([^'"`]+)['"`]/g,
    /to:\s*['"`]([^'"`]+)['"`]/g,
    /href=\{?['"`]([^'"`]+)['"`]/g,
  ];

  // Look for component files
  const componentExtensions = ['.tsx', '.jsx', '.vue', '.svelte'];
  const srcDir = path.join(projectDir, 'src');

  if (fs.existsSync(srcDir)) {
    const files = getAllFiles(srcDir, componentExtensions);
    
    for (const file of files.slice(0, 50)) { // Limit to 50 files for performance
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(srcDir, file);
      
      // Extract routes
      for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const route = match[1];
          if (route && !route.includes('${') && !route.startsWith('http')) {
            analysis.routes.push(route);
          }
        }
      }

      // Detect auth-related code
      if (content.toLowerCase().includes('login') || 
          content.toLowerCase().includes('auth') ||
          content.toLowerCase().includes('signin')) {
        analysis.authRelated = true;
      }

      // Extract form inputs
      const inputMatches = content.matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*>/g);
      const inputs: string[] = [];
      for (const match of inputMatches) {
        inputs.push(match[1]);
      }

      if (inputs.length > 0) {
        analysis.forms.push({
          name: path.basename(file, path.extname(file)),
          inputs,
          submitButton: 'button[type="submit"]',
        });
      }

      // Track component
      analysis.components.push(relativePath);
    }
  }

  // Deduplicate routes
  analysis.routes = [...new Set(analysis.routes)].slice(0, 20);

  // Infer main features from route names
  analysis.mainFeatures = analysis.routes
    .filter(r => r !== '/' && r.length > 1)
    .map(r => r.split('/')[1])
    .filter(Boolean)
    .slice(0, 10);

  return analysis;
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Generate Playwright tests using LLM based on code analysis
 */
export async function generatePlaywrightTests(
  projectName: string,
  analysis: FrontendAnalysis,
  projectDescription: string
): Promise<GeneratedTestFile[]> {
  const prompt = `You are a QA engineer generating Playwright browser tests.

## Project: ${projectName}
## Description: ${projectDescription}

## Analyzed Frontend
Routes: ${analysis.routes.join(', ') || 'Not detected'}
Components: ${analysis.components.length} files
Auth Required: ${analysis.authRelated ? 'Yes' : 'No'}
Main Features: ${analysis.mainFeatures.join(', ') || 'General'}

## Task
Generate Playwright test code that will:
1. Test the homepage loads correctly
2. Test navigation between pages
3. Test any forms with input validation
${analysis.authRelated ? '4. Test authentication flow (login/logout)' : ''}

## Output Format
For EACH test, output in this exact format:

===TEST: <test-name>===
\`\`\`typescript
async (page, baseUrl) => {
  // Test implementation using Playwright API
  await page.goto(baseUrl);
  // ... assertions and interactions
}
\`\`\`

Generate 3-5 tests. Use Playwright methods like:
- page.goto(url)
- page.locator(selector).click()
- page.locator(selector).fill(value)
- expect(page.locator(selector)).toBeVisible()
- page.waitForSelector(selector)

IMPORTANT: Each test must be self-contained and use the baseUrl parameter.`;

  const response = await callLLM(
    'You are an expert QA engineer specializing in Playwright browser automation. Output ONLY the test definitions in the specified format.',
    [{ role: 'user', content: prompt }],
    { maxTokens: 4000, temperature: 0.3 }
  );

  return parseGeneratedTests(response.content);
}

function parseGeneratedTests(content: string): GeneratedTestFile[] {
  const testFiles: GeneratedTestFile[] = [];
  
  // Parse test blocks
  const testRegex = /===TEST:\s*(.+?)===\s*```typescript\s*([\s\S]*?)```/g;
  
  let match;
  let testIndex = 0;
  
  while ((match = testRegex.exec(content)) !== null) {
    const testName = match[1].trim();
    const testCode = match[2].trim();
    
    // Wrap the test code in a proper function
    const wrappedCode = testCode.startsWith('async') ? testCode : `async (page, baseUrl) => {\n${testCode}\n}`;
    
    // Create a safe test function
    try {
      // We store the code as a string - it will be evaluated at runtime
      const testFile: GeneratedTestFile = {
        name: testName,
        content: wrappedCode,
        tests: [{
          name: testName,
          fn: eval(wrappedCode) as (page: any, baseUrl: string) => Promise<void>,
        }],
      };
      
      testFiles.push(testFile);
      testIndex++;
    } catch (error) {
      console.error(`[TestGenerator] Failed to parse test "${testName}":`, error);
    }
  }

  return testFiles;
}

/**
 * Write generated tests to files
 */
export async function writeTestFiles(
  projectName: string,
  testFiles: GeneratedTestFile[]
): Promise<string[]> {
  const projectTestDir = ensureTestDirectory(projectName);
  const filePaths: string[] = [];

  for (const testFile of testFiles) {
    const filename = `${testFile.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.test.ts`;
    const filepath = path.join(projectTestDir, filename);
    
    // Wrap in module format for execution
    const moduleContent = `// Auto-generated Playwright test
// Generated at: ${new Date().toISOString()}

import type { Page } from 'playwright';

export const testName = '${testFile.name}';
export const testFn = ${testFile.content};
`;
    
    fs.writeFileSync(filepath, moduleContent);
    filePaths.push(filepath);
  }

  return filePaths;
}

/**
 * Load test definitions from generated files
 */
export async function loadGeneratedTests(projectName: string): Promise<TestDefinition[]> {
  const projectTestDir = ensureTestDirectory(projectName);
  const tests: TestDefinition[] = [];

  if (!fs.existsSync(projectTestDir)) {
    return tests;
  }

  const files = fs.readdirSync(projectTestDir).filter(f => f.endsWith('.test.ts'));

  for (const file of files) {
    try {
      const filepath = path.join(projectTestDir, file);
      const module = await import(filepath);
      
      if (module.testName && module.testFn) {
        tests.push({
          name: module.testName,
          fn: module.testFn,
        });
      }
    } catch (error) {
      console.error(`[TestGenerator] Failed to load test from ${file}:`, error);
    }
  }

  return tests;
}

/**
 * Full test generation pipeline
 */
export async function generateAndStoreTests(
  projectName: string,
  projectDir: string,
  projectDescription: string
): Promise<{ testCount: number; testPaths: string[] }> {
  // 1. Analyze frontend code
  console.log(`[TestGenerator] Analyzing frontend for ${projectName}...`);
  const analysis = await analyzeFrontendCode(projectDir);
  
  console.log(`[TestGenerator] Found ${analysis.routes.length} routes, ${analysis.components.length} components`);

  // 2. Generate tests using LLM
  console.log(`[TestGenerator] Generating Playwright tests...`);
  const testFiles = await generatePlaywrightTests(projectName, analysis, projectDescription);
  
  console.log(`[TestGenerator] Generated ${testFiles.length} test files`);

  // 3. Write test files
  const testPaths = await writeTestFiles(projectName, testFiles);
  
  console.log(`[TestGenerator] Tests written to ${testPaths.length} files`);

  return {
    testCount: testFiles.length,
    testPaths,
  };
}

/**
 * Generate bug report from failed test
 */
export function generateBugReport(
  testName: string,
  errorMessage: string,
  screenshotPath?: string
): string {
  return `## Bug Report: ${testName}

**Severity**: Medium
**Status**: Open

### Error
\`\`\`
${errorMessage}
\`\`\`

### Reproduction Steps
1. Navigate to the application
2. Execute the test: "${testName}"
3. Observe the error

${screenshotPath ? `### Screenshot\n![Screenshot](file://${screenshotPath})\n` : ''}

### Expected Behavior
Test should pass without errors.

### Actual Behavior
${errorMessage}

### Suggested Fix
Review the component/feature being tested and ensure:
- Elements exist and are visible
- No JavaScript errors on page
- Proper data handling
`;
}
