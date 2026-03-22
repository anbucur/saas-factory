import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { CodingProvider, CodingProviderConfig, ResolvedCLI, CodingProviderInfo } from './types.js';

export const CLAUDE_CODE_INFO: CodingProviderInfo = {
  id: 'claude-code',
  name: 'Claude Code',
  description: 'Anthropic\'s official CLI for Claude-powered coding assistance',
  installUrl: 'https://docs.anthropic.com/en/docs/claude-code',
  cliName: 'claude',
};

export const claudeCodeProvider: CodingProvider = {
  info: CLAUDE_CODE_INFO,

  resolve(config?: CodingProviderConfig): ResolvedCLI | null {
    if (config?.customPath && fs.existsSync(config.customPath)) {
      return { cmd: config.customPath, name: CLAUDE_CODE_INFO.name, provider: 'claude-code' };
    }

    const claudePaths = [
      '/opt/node22/bin/claude',
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      process.platform === 'win32' && process.env.APPDATA 
        ? path.join(process.env.APPDATA, 'npm/claude.cmd') 
        : '',
      process.platform === 'win32' && process.env.APPDATA 
        ? path.join(process.env.APPDATA, 'npm/claude.exe') 
        : '',
    ].filter(Boolean);

    for (const p of claudePaths) {
      if (fs.existsSync(p)) {
        return { cmd: p, name: CLAUDE_CODE_INFO.name, provider: 'claude-code' };
      }
    }

    try {
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      const result = execSync(`${whichCmd} claude`, { encoding: 'utf-8' }).trim();
      const paths = result.split('\n').map((p: string) => p.trim());
      const validPath = process.platform === 'win32' 
        ? (paths.find((p: string) => p.endsWith('.cmd') || p.endsWith('.exe')) || paths[0]) 
        : paths[0];
      if (validPath) {
        return { cmd: validPath, name: CLAUDE_CODE_INFO.name, provider: 'claude-code' };
      }
    } catch {}

    return null;
  },

  buildArgs(config?: CodingProviderConfig): string[] {
    const baseArgs = this.getDefaultArgs();
    if (config?.additionalArgs && config.additionalArgs.length > 0) {
      return [...baseArgs, ...config.additionalArgs];
    }
    return baseArgs;
  },

  getDefaultArgs(): string[] {
    return ['--print', '--dangerously-skip-permissions'];
  },
};
