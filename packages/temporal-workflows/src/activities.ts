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
