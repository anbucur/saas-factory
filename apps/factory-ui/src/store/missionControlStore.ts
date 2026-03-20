import { create } from 'zustand'
import type { AgentType, LogEntry, PhaseId, Project } from '../types'

// Types for the new workflow
export type WorkflowStep = 
  | 'briefing'      // PM briefs BAs
  | 'requirements'   // BAs document requirements  
  | 'analysis'       // BAs analyze requirements
  | 'architecture'   // Solution Architect reviews and plans
  | 'development'    // Developers build
  | 'review'         // Code reviews
  | 'qa'             // QA testing
  | 'complete'        // Phase/sprint complete

export interface PixelAgent {
  id: string
  name: string
  role: 'pm' | 'ba1' | 'ba2' | 'architect' | 'dev1' | 'dev2' | 'qa1' | 'qa2'
  x: number  // position 0-100
  y: number
  status: 'idle' | 'working' | 'talking' | 'done'
  currentTask?: string
  progress: number
  color: string
  emoji: string
}

export interface Sprint {
  id: string
  name: string
  tasks: SprintTask[]
  status: 'pending' | 'active' | 'complete'
  progress: number
}

export interface SprintTask {
  id: string
  title: string
  assignee: 'dev1' | 'dev2'
  status: 'todo' | 'in_progress' | 'review' | 'done'
  progress: number
}

export interface MissionControlState {
  // Project info
  projectName: string
  projectDescription: string
  projectFeatures: string[]
  projectStack: string[]
  
  // Current workflow step
  currentStep: WorkflowStep
  stepProgress: number
  
  // Sprint management
  sprints: Sprint[]
  currentSprintIndex: number
  
  // Pixel agents
  agents: PixelAgent[]
  
  // Interaction logs
  agentInteractions: Array<{
    from: string
    to: string
    message: string
    timestamp: number
  }>
  
  // Build status
  buildId: string | null
  isBuilding: boolean
  buildError: string | null
  
  // Actions
  setProjectInfo: (name: string, description: string, features: string[], stack: string[]) => void
  setStep: (step: WorkflowStep, progress?: number) => void
  addSprint: (sprint: Sprint) => void
  updateSprintTask: (sprintId: string, taskId: string, status: SprintTask['status'], progress?: number) => void
  moveAgent: (agentId: string, x: number, y: number) => void
  setAgentStatus: (agentId: string, status: PixelAgent['status'], task?: string) => void
  setAgentProgress: (agentId: string, progress: number) => void
  addInteraction: (from: string, to: string, message: string) => void
  completeStep: () => void
  setBuilding: (building: boolean, buildId?: string) => void
  setBuildError: (error: string | null) => void
  reset: () => void
}

const INITIAL_AGENTS: PixelAgent[] = [
  { id: 'pm', name: 'Product Manager', role: 'pm', x: 10, y: 50, status: 'idle', color: '#6366f1', emoji: '👔' },
  { id: 'ba1', name: 'BA Sarah', role: 'ba1', x: 25, y: 30, status: 'idle', color: '#8b5cf6', emoji: '📋' },
  { id: 'ba2', name: 'BA Mike', role: 'ba2', x: 25, y: 70, status: 'idle', color: '#8b5cf6', emoji: '📋' },
  { id: 'architect', name: 'Solutions Architect', role: 'architect', x: 40, y: 50, status: 'idle', color: '#14b8a6', emoji: '🏗️' },
  { id: 'dev1', name: 'Dev Alex', role: 'dev1', x: 55, y: 30, status: 'idle', color: '#22c55e', emoji: '💻' },
  { id: 'dev2', name: 'Dev Jordan', role: 'dev2', x: 55, y: 70, status: 'idle', color: '#22c55e', emoji: '💻' },
  { id: 'qa1', name: 'QA Tester', role: 'qa1', x: 75, y: 40, status: 'idle', color: '#f59e0b', emoji: '🧪' },
  { id: 'qa2', name: 'QA Lead', role: 'qa2', x: 75, y: 60, status: 'idle', color: '#f59e0b', emoji: '🧪' },
]

export const useMissionControlStore = create<MissionControlState>((set, get) => ({
  // Initial state
  projectName: '',
  projectDescription: '',
  projectFeatures: [],
  projectStack: [],
  currentStep: 'briefing',
  stepProgress: 0,
  sprints: [],
  currentSprintIndex: 0,
  agents: INITIAL_AGENTS,
  agentInteractions: [],
  buildId: null,
  isBuilding: false,
  buildError: null,

  setProjectInfo: (name, description, features, stack) => {
    set({ projectName: name, projectDescription: description, projectFeatures: features, projectStack: stack })
  },

  setStep: (step, progress = 0) => {
    set({ currentStep: step, stepProgress: progress })
    
    // Animate agents based on step
    const agents = get().agents
    switch (step) {
      case 'briefing':
        // PM moves to center, BAs move closer
        set({
          agents: agents.map(a => {
            if (a.role === 'pm') return { ...a, x: 30, status: 'working' as const, currentTask: 'Briefing team...' }
            if (a.role === 'ba1' || a.role === 'ba2') return { ...a, status: 'talking' as const, currentTask: 'Taking notes...' }
            return a
          })
        })
        break
        
      case 'requirements':
        set({
          agents: agents.map(a => {
            if (a.role === 'ba1' || a.role === 'ba2') return { ...a, x: 35, status: 'working' as const, currentTask: 'Documenting requirements...' }
            return { ...a, status: 'idle' as const }
          })
        })
        break
        
      case 'architecture':
        set({
          agents: agents.map(a => {
            if (a.role === 'architect') return { ...a, x: 50, status: 'working' as const, currentTask: 'Reviewing and planning...' }
            if (a.role === 'ba1') return { ...a, x: 45, status: 'talking' as const, currentTask: 'Presenting analysis...' }
            return { ...a, status: 'idle' as const }
          })
        })
        break
        
      case 'development':
        set({
          agents: agents.map(a => {
            if (a.role === 'dev1' || a.role === 'dev2') return { ...a, x: 65, status: 'working' as const, currentTask: 'Building features...' }
            return { ...a, status: 'idle' as const }
          })
        })
        break
        
      case 'review':
        set({
          agents: agents.map(a => {
            if (a.role === 'dev1') return { ...a, x: 70, status: 'talking' as const, currentTask: 'Reviewing code...' }
            if (a.role === 'dev2') return { ...a, x: 70, status: 'talking' as const, currentTask: 'Being reviewed...' }
            return a
          })
        })
        break
        
      case 'qa':
        set({
          agents: agents.map(a => {
            if (a.role === 'qa1' || a.role === 'qa2') return { ...a, x: 85, status: 'working' as const, currentTask: 'Testing...' }
            if (a.role === 'dev1' || a.role === 'dev2') return { ...a, x: 80, status: 'idle' as const, currentTask: 'Waiting for bugs...' }
            return a
          })
        })
        break
        
      case 'complete':
        set({
          agents: agents.map(a => ({ ...a, status: 'done' as const, progress: 100 }))
        })
        break
    }
  },

  addSprint: (sprint) => {
    set(state => ({ sprints: [...state.sprints, sprint] }))
  },

  updateSprintTask: (sprintId, taskId, status, progress = 0) => {
    set(state => ({
      sprints: state.sprints.map(s => 
        s.id === sprintId 
          ? { 
              ...s, 
              tasks: s.tasks.map(t => 
                t.id === taskId ? { ...t, status, progress } : t
              )
            }
          : s
      )
    }))
  },

  moveAgent: (agentId, x, y) => {
    set(state => ({
      agents: state.agents.map(a => 
        a.id === agentId ? { ...a, x, y } : a
      )
    }))
  },

  setAgentStatus: (agentId, status, task) => {
    set(state => ({
      agents: state.agents.map(a => 
        a.id === agentId ? { ...a, status, currentTask: task } : a
      )
    }))
  },

  setAgentProgress: (agentId, progress) => {
    set(state => ({
      agents: state.agents.map(a => 
        a.id === agentId ? { ...a, progress } : a
      )
    }))
  },

  addInteraction: (from, to, message) => {
    set(state => ({
      agentInteractions: [...state.agentInteractions, { from, to, message, timestamp: Date.now() }]
    }))
  },

  completeStep: () => {
    const { currentStep } = get()
    const steps: WorkflowStep[] = ['briefing', 'requirements', 'analysis', 'architecture', 'development', 'review', 'qa', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      get().setStep(steps[currentIndex + 1])
    }
  },

  setBuilding: (building, buildId) => {
    set({ isBuilding: building, buildId: buildId ?? null })
  },

  setBuildError: (error) => {
    set({ buildError: error, isBuilding: false })
  },

  reset: () => {
    set({
      projectName: '',
      projectDescription: '',
      projectFeatures: [],
      projectStack: [],
      currentStep: 'briefing',
      stepProgress: 0,
      sprints: [],
      currentSprintIndex: 0,
      agents: INITIAL_AGENTS,
      agentInteractions: [],
      buildId: null,
      isBuilding: false,
      buildError: null,
    })
  },
}))

// Project store for backward compatibility
interface FactoryState {
  project: Project | null
  isRunning: boolean
  startProject: (name: string, description: string) => void
  resetProject: () => void
}

export const useFactoryStore = create<FactoryState>((set) => ({
  project: null,
  isRunning: false,
  startProject: (name, description) => {
    set({
      project: {
        id: crypto.randomUUID(),
        name,
        description,
        currentPhase: 'poc',
        phases: [],
        agents: [],
        logs: [],
        createdAt: Date.now(),
      },
      isRunning: true,
    })
  },
  resetProject: () => {
    set({ project: null, isRunning: false })
  },
}))
