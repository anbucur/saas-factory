export type CodingProviderType = 'claude-code' | 'opencode';

export interface CodingProviderInfo {
  id: CodingProviderType;
  name: string;
  description: string;
  installUrl: string;
  cliName: string;
}

export interface CodingProviderConfig {
  enabled: boolean;
  customPath?: string;
  additionalArgs?: string[];
}

export interface ResolvedCLI {
  cmd: string;
  name: string;
  provider: CodingProviderType;
}

export interface CodingAgentRequest {
  projectId: string;
  projectName: string;
  task: string;
  context: string;
  workingDirectory?: string;
  agentId?: string;
  agentRole?: string;
  phase?: string;
  sessionId?: string;
  onOutput?: (output: string, done: boolean, error?: string) => void;
}

export interface CodingAgentResult {
  success: boolean;
  output: string;
  error?: string;
  filesCreated: string[];
  filesModified: string[];
  duration: number;
  provider: CodingProviderType;
  sessionId?: string;
  prompt?: string;
}

export interface CodingProvider {
  info: CodingProviderInfo;
  resolve(config?: CodingProviderConfig): ResolvedCLI | null;
  buildArgs(config?: CodingProviderConfig): string[];
  getDefaultArgs(): string[];
}

export const PROVIDERS: CodingProviderInfo[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic\'s official CLI for Claude-powered coding assistance',
    installUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    cliName: 'claude',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Open-source AI coding assistant with multi-model support',
    installUrl: 'https://github.com/opencode-ai/opencode',
    cliName: 'opencode',
  },
];

export function getProviderInfo(type: CodingProviderType): CodingProviderInfo | undefined {
  return PROVIDERS.find(p => p.id === type);
}
