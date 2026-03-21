import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface CodingAgentRequest {
  projectId: string;
  projectName: string;
  task: string;
  context: string;
  workingDirectory?: string;
}

export interface CodingAgentResult {
  success: boolean;
  output: string;
  error?: string;
  filesCreated: string[];
  filesModified: string[];
  duration: number;
}

const GENERATED_DIR = path.resolve(process.cwd(), '../../generated');

/**
 * Resolves the Claude Code CLI binary path.
 * Claude Code is the only supported coding agent — no fallbacks.
 */
function resolveClaudeCodeCLI(): { cmd: string; name: 'Claude Code' } | null {
  // Check common installation paths
  const claudePaths = [
    '/opt/node22/bin/claude',
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    process.platform === 'win32' && process.env.APPDATA ? path.join(process.env.APPDATA, 'npm/claude.cmd') : '',
  ].filter(Boolean);

  for (const p of claudePaths) {
    if (fs.existsSync(p)) {
      return { cmd: p, name: 'Claude Code' };
    }
  }

  // Try 'claude' in PATH via which/where
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const paths = execSync(`${whichCmd} claude`, { encoding: 'utf-8' }).trim().split('\n').map((p: string) => p.trim());
    const validPath = process.platform === 'win32' ? (paths.find((p: string) => p.endsWith('.cmd') || p.endsWith('.exe')) || paths[0]) : paths[0];
    if (validPath) return { cmd: validPath, name: 'Claude Code' };
  } catch {}

  return null;
}

/**
 * Ensures the project working directory exists with a basic structure.
 */
function ensureProjectDirectory(projectName: string): string {
  const projectDir = path.join(GENERATED_DIR, projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  return projectDir;
}

/**
 * Runs Claude Code to perform a development task.
 * The agent operates in the project's generated directory.
 */
export async function runCodingAgent(request: CodingAgentRequest): Promise<CodingAgentResult> {
  const startTime = Date.now();

  const cli = resolveClaudeCodeCLI();
  if (!cli) {
    return {
      success: false,
      output: '',
      error: 'Claude Code is not installed. Install it with `npm i -g @anthropic-ai/claude-code`.',
      filesCreated: [],
      filesModified: [],
      duration: Date.now() - startTime,
    };
  }

  const workDir = request.workingDirectory || ensureProjectDirectory(request.projectName);

  // Get files before to track changes
  const filesBefore = getFilesRecursive(workDir);

  const prompt = buildCodingPrompt(request);

  try {
    const output = await executeCLI(cli.cmd, prompt, workDir);

    // Get files after to detect changes
    const filesAfter = getFilesRecursive(workDir);

    const filesCreated = filesAfter.filter(f => !filesBefore.includes(f));
    const filesModified = filesAfter.filter(f => {
      if (filesCreated.includes(f)) return false;
      const beforeStat = filesBefore.includes(f);
      return beforeStat; // Simplified - in practice would compare mtimes
    });

    return {
      success: true,
      output: `[${cli.name}] Task completed successfully.\n\n${output}`,
      filesCreated,
      filesModified,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: `[${cli.name}] Error: ${error.message}`,
      filesCreated: [],
      filesModified: [],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Executes the coding CLI with the given prompt.
 */
function executeCLI(cmd: string, prompt: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Pass prompt via stdin to avoid shell escaping issues on Windows.
    // `claude --print` reads from stdin when no positional prompt is given.
    const args = [
      '--print',
      '--dangerously-skip-permissions',
    ];

    const proc = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        CI: 'true',
        DISABLE_PROMPT: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 600_000, // 10 minute timeout per task
      shell: process.platform === 'win32',
    });

    // Pipe the prompt via stdin so it doesn't get mangled by shell escaping
    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 || stdout.length > 0) {
        resolve(stdout || stderr);
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Builds a comprehensive prompt for the coding agent.
 */
function buildCodingPrompt(request: CodingAgentRequest): string {
  return `You are working on a SaaS project called "${request.projectName}".

## Context
${request.context}

## Task
${request.task}

## Instructions
- Write clean, production-quality code
- Follow best practices for the technology stack
- Include proper error handling
- Add TypeScript types where applicable
- Create necessary files and directories
- If this is a new project, set up the project structure first
`;
}

/**
 * Recursively gets all file paths in a directory.
 */
function getFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Checks if a coding agent CLI is available.
 */
export function isCodingAgentAvailable(): { available: boolean; name: string } {
  const cli = resolveClaudeCodeCLI();
  if (cli) {
    return { available: true, name: cli.name };
  }
  return { available: false, name: 'none' };
}
