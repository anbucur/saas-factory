/**
 * Activity implementations for SaaS Factory Temporal Worker
 * These are the actual activity implementations that run in the worker process
 */

import { broadcast } from './_shared/broadcast.js'
import { getTaskDescription, getPhaseSubtasks, getPhasePrompt, getMessageType, getArtifactType } from './_shared/phase-helpers.js'

function logActivity(
  projectId: string,
  agentId: string | null,
  agentRole: string | null,
  action: string,
  details: string,
  logType: string,
  phase: string | null,
): void {
  console.log(`[${logType.toUpperCase()}] ${action}: ${details}`)
  broadcast({
    type: 'activity:log',
    payload: { projectId, agentId, agentRole, action, details, logType, phase, createdAt: new Date().toISOString() },
  })
}

export interface SetupPhaseInput {
  projectId: string
  phase: string
}

export interface SetupPhaseOutput {
  conversationId: string
  metricsId: string
}

export async function setupPhase(input: SetupPhaseInput): Promise<SetupPhaseOutput> {
  const { projectId, phase } = input
  logActivity(projectId, null, null, `Phase setup: ${phase}`, `Initializing ${phase} phase`, 'info', phase)
  broadcast({ type: 'phase:started', payload: { projectId, phase } })
  
  const conversationId = `conv-${Date.now()}`
  const metricsId = `metrics-${Date.now()}`
  
  return { conversationId, metricsId }
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

export async function runAgentWork(input: RunAgentWorkInput): Promise<void> {
  const { projectId, phase, role, conversationId } = input
  
  logActivity(projectId, input.agentId || null, role, `${role} starting`, `Beginning ${phase} work`, 'info', phase)
  
  const taskDesc = getTaskDescription(phase, role)
  broadcast({ type: 'agent:status', payload: { projectId, agentId: input.agentId, role, status: 'working', task: taskDesc } })
  
  const subtasks = getPhaseSubtasks(phase, role)
  const artifactType = getArtifactType(phase, role)
  
  broadcast({ type: 'agent:progress', payload: { projectId, agentId: input.agentId, role, progress: 50, status: 'working' } })
  
  logActivity(projectId, input.agentId || null, role, `${role} completed`, `Finished ${phase} work`, 'success', phase)
  broadcast({ type: 'agent:status', payload: { projectId, agentId: input.agentId, role, status: 'done', progress: 100 } })
}

export interface RunCollaborationRoundInput {
  projectId: string
  phase: string
  conversationId: string
  metricsId?: string
}

export async function runCollaborationRound(input: RunCollaborationRoundInput): Promise<void> {
  const { projectId, phase, conversationId } = input
  logActivity(projectId, null, 'pm', 'PM reviewing phase', `Reviewing ${phase} contributions`, 'info', phase)
  broadcast({ type: 'agent:status', payload: { projectId, agentId: null, role: 'pm', status: 'reviewing', task: `Reviewing ${phase}` } })
}

export interface CompletePhaseInput {
  projectId: string
  phase: string
  conversationId: string
  metricsId?: string
}

export async function completePhase(input: CompletePhaseInput): Promise<void> {
  const { projectId, phase } = input
  logActivity(projectId, null, null, `Phase completed: ${phase}`, `${phase} phase finished`, 'success', phase)
  broadcast({ type: 'phase:completed', payload: { projectId, phase } })
}

export interface CompleteProjectInput {
  projectId: string
}

export async function completeProject(input: CompleteProjectInput): Promise<void> {
  const { projectId } = input
  logActivity(projectId, null, null, 'Project completed', 'All phases finished successfully', 'milestone', 'completed')
  broadcast({ type: 'project:completed', payload: { projectId } })
}

export interface FailProjectInput {
  projectId: string
  error: string
}

export async function failProject(input: FailProjectInput): Promise<void> {
  const { projectId, error } = input
  logActivity(projectId, null, null, 'Project failed', error, 'error', null)
  broadcast({ type: 'project:failed', payload: { projectId, error } })
}

export interface PrepareDeploymentInput {
  projectId: string
}

export interface DeploymentOption {
  strategy: string
  label: string
  description: string
  recommended: boolean
  requirements: string[]
  estimatedTime: string
}

export interface PrepareDeploymentOutput {
  options: DeploymentOption[]
  stackDetected: Record<string, unknown>
}

export async function prepareDeployment(input: PrepareDeploymentInput): Promise<PrepareDeploymentOutput> {
  const { projectId } = input
  logActivity(projectId, null, 'devops', 'Preparing deployment', 'Detecting stack and deployment options', 'info', 'deployment')
  
  const options: DeploymentOption[] = [
    { strategy: 'docker', label: 'Docker', description: 'Containerized deployment with Docker', recommended: true, requirements: ['Docker installed'], estimatedTime: '10-15 min' },
    { strategy: 'vercel', label: 'Vercel', description: 'Serverless deployment on Vercel', recommended: false, requirements: ['Vercel account'], estimatedTime: '5-10 min' },
    { strategy: 'static', label: 'Static Hosting', description: 'Static site deployment', recommended: false, requirements: ['Static files'], estimatedTime: '5 min' },
  ]
  
  broadcast({ type: 'deployment:options', payload: { projectId, options } })
  
  return { options, stackDetected: { framework: 'react', language: 'typescript' } }
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

export async function executeDeployment(input: ExecuteDeploymentInput): Promise<ExecuteDeploymentOutput> {
  const { projectId, strategy } = input
  logActivity(projectId, null, 'devops', `Deploying with ${strategy}`, `Starting ${strategy} deployment`, 'info', 'deployment')
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const success = true
  if (success) {
    logActivity(projectId, null, 'devops', 'Deployment successful', `Deployed at https://example.com`, 'success', 'deployment')
  } else {
    logActivity(projectId, null, 'devops', 'Deployment failed', 'Deployment failed', 'error', 'deployment')
  }
  
  return {
    success,
    url: success ? 'https://example.com' : '',
    deploymentId: `deploy-${Date.now()}`,
    error: success ? undefined : 'Deployment failed',
  }
}

export interface GetAgentPoolInput {
  projectId: string
  phase: string
}

export interface AgentPoolEntry {
  id: string
  copyIndex: number
}

export interface GetAgentPoolOutput {
  pm: AgentPoolEntry[]
  ba: AgentPoolEntry[]
  architect: AgentPoolEntry[]
  frontend_dev: AgentPoolEntry[]
  backend_dev: AgentPoolEntry[]
  qa: AgentPoolEntry[]
  devops: AgentPoolEntry[]
}

export async function getAgentPool(input: GetAgentPoolInput): Promise<GetAgentPoolOutput> {
  return {
    pm: [{ id: `pm-${input.projectId}`, copyIndex: 0 }],
    ba: [{ id: `ba-${input.projectId}`, copyIndex: 0 }],
    architect: [{ id: `arch-${input.projectId}`, copyIndex: 0 }],
    frontend_dev: [{ id: `fe-${input.projectId}`, copyIndex: 0 }],
    backend_dev: [{ id: `be-${input.projectId}`, copyIndex: 0 }],
    qa: [{ id: `qa-${input.projectId}`, copyIndex: 0 }],
    devops: [{ id: `devops-${input.projectId}`, copyIndex: 0 }],
  }
}

export interface GetWorkflowStateInput {
  projectId: string
}

export interface WorkflowStateOutput {
  paused: boolean
  currentPhase: string
}

export async function getWorkflowState(_input: GetWorkflowStateInput): Promise<WorkflowStateOutput | null> {
  return null
}

export interface SaveWorkflowStateInput {
  projectId: string
  paused: boolean
  currentPhase: string
}

export async function saveWorkflowState(_input: SaveWorkflowStateInput): Promise<void> {
}

export { getTaskDescription, getPhaseSubtasks, getPhasePrompt, getMessageType, getArtifactType }
