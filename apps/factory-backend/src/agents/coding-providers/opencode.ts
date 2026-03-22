import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { CodingProvider, CodingProviderConfig, ResolvedCLI, CodingProviderInfo } from './types.js';

export const OPENCODE_INFO: CodingProviderInfo = {
  id: 'opencode',
  name: 'OpenCode',
  description: 'Open-source AI coding assistant with multi-model support',
  installUrl: 'https://github.com/opencode-ai/opencode',
  cliName: 'opencode',
};

export const opencodeProvider: CodingProvider = {
  info: OPENCODE_INFO,

  resolve(config?: CodingProviderConfig): ResolvedCLI | null {
    if (config?.customPath && fs.existsSync(config.customPath)) {
      return { cmd: config.customPath, name: OPENCODE_INFO.name, provider: 'opencode' };
    }

    const opencodePaths = process.platform === 'win32'
      ? [
          path.join(process.env.APPDATA || '', 'npm', 'opencode.cmd'),
          path.join(process.env.LOCALAPPDATA || '', 'npm', 'opencode.cmd'),
          'C:\\Program Files\\nodejs\\opencode.cmd',
        ]
      : [
          '/usr/local/bin/opencode',
          '/usr/bin/opencode',
          path.join(process.env.HOME || '', '.local', 'bin', 'opencode'),
          path.join(process.env.HOME || '', 'go', 'bin', 'opencode'),
        ];

    for (const p of opencodePaths) {
      if (p && fs.existsSync(p)) {
        return { cmd: p, name: OPENCODE_INFO.name, provider: 'opencode' };
      }
    }

    try {
      const whichCmd = process.platform === 'win32' ? 'where opencode' : 'which opencode';
      const result = execSync(whichCmd, { encoding: 'utf-8', timeout: 5000 }).trim();
      if (result) {
        const cmdPath = result.split('\n')[0].trim();
        if (fs.existsSync(cmdPath)) {
          return { cmd: cmdPath, name: OPENCODE_INFO.name, provider: 'opencode' };
        }
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
    return ['run'];
  },
};
