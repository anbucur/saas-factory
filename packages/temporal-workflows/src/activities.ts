/**
 * Temporal Activity type stubs for SaaS Factory workflow.
 * Actual implementations live in apps/factory-backend/src/worker.ts
 */

export interface SetupPhaseInput {
  projectId: string
  phase: string
}

export interface SetupPhaseOutput {
  conversationId: string
  metricsId: string
}

export interface RunAgentWorkInput {
  projectId: string
  phase: string
  role: string
  conversationId: string
  metricsId?: string
  agentId?: string
  subtaskSlice?: { start: number; end: number; total: number }
}

export interface RunCollaborationRoundInput {
  projectId: string
  phase: string
  conversationId: string
  metricsId?: string
}

export interface CompletePhaseInput {
  projectId: string
  phase: string
  conversationId: string
  metricsId?: string
}

export interface CompleteProjectInput {
  projectId: string
}

export interface FailProjectInput {
  projectId: string
  error: string
}

export async function setupPhase(_input: SetupPhaseInput): Promise<SetupPhaseOutput> {
  throw new Error('Activity stub — implemented in worker')
}

export async function runAgentWork(_input: RunAgentWorkInput): Promise<void> {
  throw new Error('Activity stub — implemented in worker')
}

export async function runCollaborationRound(_input: RunCollaborationRoundInput): Promise<void> {
  throw new Error('Activity stub — implemented in worker')
}

export async function completePhase(_input: CompletePhaseInput): Promise<void> {
  throw new Error('Activity stub — implemented in worker')
}

export async function completeProject(_input: CompleteProjectInput): Promise<void> {
  throw new Error('Activity stub — implemented in worker')
}

export async function failProject(_input: FailProjectInput): Promise<void> {
  throw new Error('Activity stub — implemented in worker')
}

export interface PrepareDeploymentInput {
  projectId: string
}

export interface PrepareDeploymentOutput {
  options: Array<{
    strategy: string
    label: string
    description: string
    recommended: boolean
    requirements: string[]
    estimatedTime: string
  }>
  stackDetected: Record<string, unknown>
}

export interface ExecuteDeploymentInput {
  projectId: string
  strategy: 'docker' | 'vercel' | 'static'
}

export interface ExecuteDeploymentOutput {
  success: boolean
  url: string
  deploymentId: string
  error?: string
}

export async function prepareDeployment(_input: PrepareDeploymentInput): Promise<PrepareDeploymentOutput> {
  throw new Error('Activity stub — implemented in worker')
}

export async function executeDeployment(_input: ExecuteDeploymentInput): Promise<ExecuteDeploymentOutput> {
  throw new Error('Activity stub — implemented in worker')
}

export interface GetAgentPoolInput {
  projectId: string
  phase: string
}

export type AgentPoolEntry = { id: string; copyIndex: number }

export interface GetAgentPoolOutput {
  pm: AgentPoolEntry[]
  ba: AgentPoolEntry[]
  architect: AgentPoolEntry[]
  frontend_dev: AgentPoolEntry[]
  backend_dev: AgentPoolEntry[]
  qa: AgentPoolEntry[]
  devops: AgentPoolEntry[]
}

export async function getAgentPool(_input: GetAgentPoolInput): Promise<GetAgentPoolOutput> {
  throw new Error('Activity stub — implemented in worker')
}
