import { create } from 'zustand'
import type { Agent, AgentType, LogEntry, Phase, PhaseId, Project } from '../types'

// Agent metadata
export const AGENT_META: Record<AgentType, { label: string; color: string; emoji: string }> = {
  coder: { label: 'Coder', color: '#6366f1', emoji: '🧑‍💻' },
  ui: { label: 'UI Agent', color: '#ec4899', emoji: '🎨' },
  security: { label: 'Security', color: '#22c55e', emoji: '🛡️' },
  billing: { label: 'Billing', color: '#f59e0b', emoji: '💰' },
  deploy: { label: 'Deploy', color: '#06b6d4', emoji: '🚀' },
  ramses: { label: 'Ramses', color: '#eab308', emoji: '🔱' },
}

// Zone positions on the board (percentage-based)
export const ZONE_POSITIONS: Record<PhaseId, { x: number; y: number }> = {
  poc: { x: 15, y: 50 },
  enhance: { x: 38, y: 50 },
  security: { x: 62, y: 50 },
  prod: { x: 85, y: 50 },
}

interface FactoryState {
  project: Project | null
  isRunning: boolean

  // Actions
  startProject: (name: string, description: string) => void
  spawnAgent: (type: AgentType, task: string) => void
  updateAgentProgress: (agentId: string, progress: number, message: string) => void
  completeAgent: (agentId: string) => void
  errorAgent: (agentId: string, error: string) => void
  completePhase: (phaseId: PhaseId) => void
  addLog: (agentId: string, agentType: AgentType, message: string, type: LogEntry['type']) => void
  completeProject: (url: string) => void
  resetProject: () => void
}

const PHASE_ORDER: PhaseId[] = ['poc', 'enhance', 'security', 'prod']

function createInitialProject(name: string, description: string): Project {
  const phases: Phase[] = [
    { id: 'poc', label: 'PoC', description: 'Proof of Concept', agents: ['coder', 'ui'], status: 'active' },
    { id: 'enhance', label: 'Enhance', description: 'Polish & Improve', agents: ['coder', 'ui'], status: 'locked' },
    { id: 'security', label: 'Security', description: 'Harden & Scan', agents: ['security', 'coder'], status: 'locked' },
    { id: 'prod', label: 'Prod', description: 'Deploy & Bill', agents: ['billing', 'deploy'], status: 'locked' },
  ]

  return {
    id: crypto.randomUUID(),
    name,
    description,
    currentPhase: 'poc',
    phases,
    agents: [],
    logs: [],
    createdAt: Date.now(),
  }
}

let logCounter = 0

export const useFactoryStore = create<FactoryState>((set, get) => ({
  project: null,
  isRunning: false,

  startProject: (name, description) => {
    const project = createInitialProject(name, description)
    set({ project, isRunning: true })
  },

  spawnAgent: (type, task) => {
    const { project } = get()
    if (!project) return

    const agent: Agent = {
      id: crypto.randomUUID(),
      type,
      name: AGENT_META[type].label,
      status: 'working',
      progress: 0,
      currentTask: task,
      startedAt: Date.now(),
    }

    set({
      project: {
        ...project,
        agents: [...project.agents, agent],
      },
    })

    get().addLog(agent.id, type, `Spawned: ${task}`, 'info')
  },

  updateAgentProgress: (agentId, progress, message) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        agents: project.agents.map((a) =>
          a.id === agentId ? { ...a, progress, currentTask: message } : a
        ),
      },
    })

    const agent = project.agents.find((a) => a.id === agentId)
    if (agent) {
      get().addLog(agentId, agent.type, message, 'progress')
    }
  },

  completeAgent: (agentId) => {
    const { project } = get()
    if (!project) return

    const updatedAgents = project.agents.map((a) =>
      a.id === agentId
        ? { ...a, status: 'done' as const, progress: 100, completedAt: Date.now(), currentTask: 'Complete' }
        : a
    )

    // Check if all agents in current phase are done
    const currentPhase = project.currentPhase
    const phase = project.phases.find((p) => p.id === currentPhase)
    const phaseAgents = updatedAgents.filter((a) => phase?.agents.includes(a.type))
    const allPhaseAgentsDone = phaseAgents.every((a) => a.status === 'done')

    set({ project: { ...project, agents: updatedAgents } })

    const agent = project.agents.find((a) => a.id === agentId)
    if (agent) {
      get().addLog(agentId, agent.type, 'Task complete ✓', 'success')
    }

    if (allPhaseAgentsDone) {
      get().completePhase(currentPhase)
    }
  },

  errorAgent: (agentId, error) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        agents: project.agents.map((a) =>
          a.id === agentId ? { ...a, status: 'error' as const, currentTask: error } : a
        ),
      },
    })

    const agent = project.agents.find((a) => a.id === agentId)
    if (agent) {
      get().addLog(agentId, agent.type, `Error: ${error}`, 'error')
    }
  },

  completePhase: (phaseId) => {
    const { project } = get()
    if (!project) return

    const phaseIndex = PHASE_ORDER.indexOf(phaseId)
    const nextPhase = PHASE_ORDER[phaseIndex + 1]

    set({
      project: {
        ...project,
        phases: project.phases.map((p) =>
          p.id === phaseId ? { ...p, status: 'complete' as const } : p
        ),
        currentPhase: nextPhase || phaseId,
      },
    })

    if (nextPhase) {
      // Unlock next phase
      set((state) => {
        if (!state.project) return state
        return {
          project: {
            ...state.project,
            phases: state.project.phases.map((p) =>
              p.id === nextPhase ? { ...p, status: 'active' as const } : p
            ),
          },
        }
      })
    }
  },

  addLog: (agentId, agentType, message, type) => {
    const { project } = get()
    if (!project) return

    const entry: LogEntry = {
      id: `log-${++logCounter}`,
      timestamp: Date.now(),
      agentId,
      agentType,
      message,
      type,
    }

    set({
      project: {
        ...project,
        logs: [...project.logs.slice(-99), entry], // Keep last 100
      },
    })
  },

  completeProject: (url) => {
    const { project } = get()
    if (!project) return

    get().addLog('system', 'ramses', `🚀 Project live at ${url}`, 'success')

    set({
      project: {
        ...project,
        completedAt: Date.now(),
      },
      isRunning: false,
    })
  },

  resetProject: () => {
    set({ project: null, isRunning: false })
  },
}))
