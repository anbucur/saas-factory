// Agent types
export type AgentType =
  | 'coder'
  | 'ui'
  | 'security'
  | 'billing'
  | 'deploy'
  | 'ramses'
  | 'spec-generator'
  | 'scaffolder'
  | 'builder'
  | 'tester'

export type AgentStatus = 'idle' | 'working' | 'done' | 'error'

export interface Agent {
  id: string
  type: AgentType
  name: string
  status: AgentStatus
  progress: number // 0-100
  currentTask?: string
  startedAt?: number
  completedAt?: number
}

// Phase types
export type PhaseId = 'poc' | 'enhance' | 'security' | 'prod'

export interface Phase {
  id: PhaseId
  label: string
  description: string
  agents: AgentType[]
  status: 'locked' | 'active' | 'complete'
}

// Log entry
export interface LogEntry {
  id: string
  timestamp: number
  agentId: string
  agentType: AgentType
  message: string
  type: 'info' | 'success' | 'error' | 'progress'
}

// Project
export interface Project {
  id: string
  name: string
  description: string
  currentPhase: PhaseId
  phases: Phase[]
  agents: Agent[]
  logs: LogEntry[]
  createdAt: number
  completedAt?: number
}

// WebSocket events from backend
export type WSEvent =
  | { type: 'agent:spawn'; payload: { agentId: string; agent: string; task: string } }
  | { type: 'agent:progress'; payload: { agentId: string; progress: number; message: string } }
  | { type: 'agent:complete'; payload: { agentId: string } }
  | { type: 'agent:error'; payload: { agentId: string; error: string } }
  | { type: 'phase:complete'; payload: { phaseId: PhaseId } }
  | { type: 'phase:start'; payload: { phaseId: PhaseId } }
  | { type: 'log'; payload: Omit<LogEntry, 'id' | 'timestamp'> }
  | { type: 'project:complete'; payload: { url: string } }
