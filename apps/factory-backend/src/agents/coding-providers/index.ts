export * from './types.js';
export { claudeCodeProvider, CLAUDE_CODE_INFO } from './claude-code.js';
export { opencodeProvider, OPENCODE_INFO } from './opencode.js';

import type { CodingProvider, CodingProviderType } from './types.js';
import { claudeCodeProvider } from './claude-code.js';
import { opencodeProvider } from './opencode.js';

const providerMap: Record<CodingProviderType, CodingProvider> = {
  'claude-code': claudeCodeProvider,
  'opencode': opencodeProvider,
};

export function getProvider(type: CodingProviderType): CodingProvider | undefined {
  return providerMap[type];
}

export function getAllProviders(): CodingProvider[] {
  return Object.values(providerMap);
}
