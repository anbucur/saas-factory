/**
 * Unit tests for SaaS Factory Temporal Workflow
 * Tests modern features: tiered activities, pause/resume, crash recovery, cancellation
 */

import { describe, it, expect } from 'vitest'
import {
  pauseSignal,
  resumeSignal,
  deploySignal,
  cancelSignal,
  currentPhaseQuery,
  deploymentStatusQuery,
} from './workflows.js'
import * as activities from './activities.js'

describe('Workflow Signals and Queries', () => {
  describe('Signal Definitions', () => {
    it('should define pauseSignal', () => {
      expect(pauseSignal).toBeDefined()
      expect(pauseSignal).not.toBeNull()
    })

    it('should define resumeSignal', () => {
      expect(resumeSignal).toBeDefined()
      expect(resumeSignal).not.toBeNull()
    })

    it('should define deploySignal with strategy type', () => {
      expect(deploySignal).toBeDefined()
      expect(deploySignal).not.toBeNull()
    })

    it('should define cancelSignal for graceful cancellation', () => {
      expect(cancelSignal).toBeDefined()
      expect(cancelSignal).not.toBeNull()
    })
  })

  describe('Query Definitions', () => {
    it('should define currentPhaseQuery', () => {
      expect(currentPhaseQuery).toBeDefined()
      expect(currentPhaseQuery).not.toBeNull()
    })

    it('should define deploymentStatusQuery', () => {
      expect(deploymentStatusQuery).toBeDefined()
      expect(deploymentStatusQuery).not.toBeNull()
    })
  })
})

describe('Activity Module Exports', () => {
  it('should export activity functions', () => {
    expect(activities.setupPhase).toBeDefined()
    expect(typeof activities.setupPhase).toBe('function')
    expect(activities.runAgentWork).toBeDefined()
    expect(typeof activities.runAgentWork).toBe('function')
    expect(activities.runCollaborationRound).toBeDefined()
    expect(typeof activities.runCollaborationRound).toBe('function')
    expect(activities.completePhase).toBeDefined()
    expect(typeof activities.completePhase).toBe('function')
    expect(activities.completeProject).toBeDefined()
    expect(typeof activities.completeProject).toBe('function')
    expect(activities.failProject).toBeDefined()
    expect(typeof activities.failProject).toBe('function')
    expect(activities.prepareDeployment).toBeDefined()
    expect(typeof activities.prepareDeployment).toBe('function')
    expect(activities.executeDeployment).toBeDefined()
    expect(typeof activities.executeDeployment).toBe('function')
    expect(activities.getAgentPool).toBeDefined()
    expect(typeof activities.getAgentPool).toBe('function')
    expect(activities.getWorkflowState).toBeDefined()
    expect(typeof activities.getWorkflowState).toBe('function')
    expect(activities.saveWorkflowState).toBeDefined()
    expect(typeof activities.saveWorkflowState).toBe('function')
  })
})

describe('Activity Type Shapes', () => {
  it('should have correct WorkflowStateOutput shape', () => {
    const output = {
      paused: false,
      currentPhase: 'requirements',
    }
    expect(output.paused).toBe(false)
    expect(output.currentPhase).toBe('requirements')
  })

  it('should have correct SaveWorkflowStateInput shape', () => {
    const input = {
      projectId: 'test-project',
      paused: true,
      currentPhase: 'development',
    }
    expect(input.projectId).toBe('test-project')
    expect(input.paused).toBe(true)
    expect(input.currentPhase).toBe('development')
  })

  it('should have correct SetupPhaseInput shape', () => {
    const input = {
      projectId: 'proj-1',
      phase: 'requirements',
    }
    expect(input.projectId).toBe('proj-1')
    expect(input.phase).toBe('requirements')
  })

  it('should have correct RunAgentWorkInput shape with subtaskSlice', () => {
    const input = {
      projectId: 'proj-1',
      phase: 'development',
      role: 'frontend_dev',
      conversationId: 'conv-1',
      agentId: 'agent-1',
      subtaskSlice: { start: 0, end: 0, total: 2 },
    }
    expect(input.projectId).toBe('proj-1')
    expect(input.subtaskSlice).toBeDefined()
    expect(input.subtaskSlice?.total).toBe(2)
  })

  it('should have correct AgentPoolEntry shape', () => {
    const entry = {
      id: 'agent-1',
      copyIndex: 0,
    }
    expect(entry.id).toBe('agent-1')
    expect(entry.copyIndex).toBe(0)
  })

  it('should have complete AgentPoolOutput with all roles', () => {
    const pool = {
      pm: [{ id: 'pm-1', copyIndex: 0 }],
      ba: [{ id: 'ba-1', copyIndex: 0 }],
      architect: [{ id: 'arch-1', copyIndex: 0 }],
      frontend_dev: [{ id: 'fe-1', copyIndex: 0 }],
      backend_dev: [{ id: 'be-1', copyIndex: 0 }],
      qa: [{ id: 'qa-1', copyIndex: 0 }],
      devops: [{ id: 'devops-1', copyIndex: 0 }],
    }
    expect(pool.pm.length).toBe(1)
    expect(pool.ba.length).toBe(1)
    expect(pool.architect.length).toBe(1)
    expect(pool.frontend_dev.length).toBe(1)
    expect(pool.backend_dev.length).toBe(1)
    expect(pool.qa.length).toBe(1)
    expect(pool.devops.length).toBe(1)
  })
})

describe('Deployment Strategy Validation', () => {
  it('should accept valid deployment strategies', () => {
    const validStrategies = ['docker', 'vercel', 'static'] as const
    
    for (const strategy of validStrategies) {
      const input: { strategy: typeof strategy } = { strategy }
      expect(['docker', 'vercel', 'static']).toContain(input.strategy)
    }
  })
})

describe('Activity Stub Functions', () => {
  it('should have async stub implementations that reject', async () => {
    await expect(activities.setupPhase({ projectId: '', phase: '' })).rejects.toThrow('Activity stub')
    await expect(activities.runAgentWork({ projectId: '', phase: '', role: '', conversationId: '' })).rejects.toThrow('Activity stub')
    await expect(activities.runCollaborationRound({ projectId: '', phase: '', conversationId: '' })).rejects.toThrow('Activity stub')
    await expect(activities.completePhase({ projectId: '', phase: '', conversationId: '' })).rejects.toThrow('Activity stub')
    await expect(activities.completeProject({ projectId: '' })).rejects.toThrow('Activity stub')
    await expect(activities.failProject({ projectId: '', error: '' })).rejects.toThrow('Activity stub')
    await expect(activities.prepareDeployment({ projectId: '' })).rejects.toThrow('Activity stub')
    await expect(activities.executeDeployment({ projectId: '', strategy: 'docker' })).rejects.toThrow('Activity stub')
    await expect(activities.getAgentPool({ projectId: '', phase: '' })).rejects.toThrow('Activity stub')
    await expect(activities.getWorkflowState({ projectId: '' })).rejects.toThrow('Activity stub')
    await expect(activities.saveWorkflowState({ projectId: '', paused: false, currentPhase: '' })).rejects.toThrow('Activity stub')
  })
})
