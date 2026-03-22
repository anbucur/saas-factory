/**
 * Unit tests for Factory Worker Activities
 * Tests the activity implementations in isolation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  setupPhase,
  runAgentWork,
  runCollaborationRound,
  completePhase,
  completeProject,
  failProject,
  prepareDeployment,
  executeDeployment,
  getAgentPool,
  getWorkflowState,
  saveWorkflowState,
} from './index.js'

vi.mock('./_shared/broadcast.js', () => ({
  broadcast: vi.fn(),
}))

const { broadcast } = await import('./_shared/broadcast.js')

describe('Activity: setupPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create conversation and metrics IDs', async () => {
    const result = await setupPhase({
      projectId: 'test-project',
      phase: 'requirements',
    })

    expect(result.conversationId).toMatch(/^conv-\d+$/)
    expect(result.metricsId).toMatch(/^metrics-\d+$/)
  })

  it('should broadcast phase:started event', async () => {
    await setupPhase({
      projectId: 'test-project',
      phase: 'requirements',
    })

    expect(broadcast).toHaveBeenCalledWith({
      type: 'phase:started',
      payload: { projectId: 'test-project', phase: 'requirements' },
    })
  })

  it('should log activity', async () => {
    await setupPhase({
      projectId: 'test-project',
      phase: 'requirements',
    })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity:log',
        payload: expect.objectContaining({
          projectId: 'test-project',
          action: 'Phase setup: requirements',
          logType: 'info',
          phase: 'requirements',
        }),
      })
    )
  })
})

describe('Activity: runAgentWork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should broadcast agent:status working event', async () => {
    await runAgentWork({
      projectId: 'test-project',
      phase: 'development',
      role: 'frontend_dev',
      conversationId: 'conv-123',
    })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'agent:status',
        payload: expect.objectContaining({
          projectId: 'test-project',
          role: 'frontend_dev',
          status: 'working',
        }),
      })
    )
  })

  it('should broadcast agent:progress event', async () => {
    await runAgentWork({
      projectId: 'test-project',
      phase: 'development',
      role: 'backend_dev',
      conversationId: 'conv-123',
    })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'agent:progress',
        payload: expect.objectContaining({
          projectId: 'test-project',
          role: 'backend_dev',
          progress: 50,
          status: 'working',
        }),
      })
    )
  })

  it('should broadcast agent:status done event', async () => {
    await runAgentWork({
      projectId: 'test-project',
      phase: 'development',
      role: 'frontend_dev',
      conversationId: 'conv-123',
    })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'agent:status',
        payload: expect.objectContaining({
          projectId: 'test-project',
          role: 'frontend_dev',
          status: 'done',
          progress: 100,
        }),
      })
    )
  })
})

describe('Activity: runCollaborationRound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should broadcast agent:status reviewing event for PM', async () => {
    await runCollaborationRound({
      projectId: 'test-project',
      phase: 'architecture',
      conversationId: 'conv-123',
    })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'agent:status',
        payload: expect.objectContaining({
          projectId: 'test-project',
          role: 'pm',
          status: 'reviewing',
        }),
      })
    )
  })
})

describe('Activity: completePhase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should broadcast phase:completed event', async () => {
    await completePhase({
      projectId: 'test-project',
      phase: 'development',
      conversationId: 'conv-123',
    })

    expect(broadcast).toHaveBeenCalledWith({
      type: 'phase:completed',
      payload: { projectId: 'test-project', phase: 'development' },
    })
  })
})

describe('Activity: completeProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should broadcast project:completed event', async () => {
    await completeProject({ projectId: 'test-project' })

    expect(broadcast).toHaveBeenCalledWith({
      type: 'project:completed',
      payload: { projectId: 'test-project' },
    })
  })
})

describe('Activity: failProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should broadcast project:failed event with error', async () => {
    await failProject({
      projectId: 'test-project',
      error: 'Something went wrong',
    })

    expect(broadcast).toHaveBeenCalledWith({
      type: 'project:failed',
      payload: { projectId: 'test-project', error: 'Something went wrong' },
    })
  })
})

describe('Activity: prepareDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return deployment options', async () => {
    const result = await prepareDeployment({ projectId: 'test-project' })

    expect(result.options).toHaveLength(3)
    expect(result.options[0].strategy).toBe('docker')
    expect(result.options[0].recommended).toBe(true)
  })

  it('should detect stack', async () => {
    const result = await prepareDeployment({ projectId: 'test-project' })

    expect(result.stackDetected).toEqual({ framework: 'react', language: 'typescript' })
  })

  it('should broadcast deployment:options event', async () => {
    await prepareDeployment({ projectId: 'test-project' })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'deployment:options',
        payload: expect.objectContaining({
          projectId: 'test-project',
          options: expect.any(Array),
        }),
      })
    )
  })
})

describe('Activity: executeDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success for docker strategy', async () => {
    const result = await executeDeployment({
      projectId: 'test-project',
      strategy: 'docker',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://example.com')
    expect(result.deploymentId).toMatch(/^deploy-\d+$/)
  })

  it('should return success for vercel strategy', async () => {
    const result = await executeDeployment({
      projectId: 'test-project',
      strategy: 'vercel',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://example.com')
  })

  it('should broadcast deployment status events', async () => {
    await executeDeployment({
      projectId: 'test-project',
      strategy: 'docker',
    })

    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity:log',
        payload: expect.objectContaining({
          projectId: 'test-project',
          action: 'Deploying with docker',
        }),
      })
    )
  })
})

describe('Activity: getAgentPool', () => {
  it('should return agent pool for all roles', async () => {
    const result = await getAgentPool({
      projectId: 'test-project',
      phase: 'development',
    })

    expect(result.pm).toHaveLength(1)
    expect(result.ba).toHaveLength(1)
    expect(result.architect).toHaveLength(1)
    expect(result.frontend_dev).toHaveLength(1)
    expect(result.backend_dev).toHaveLength(1)
    expect(result.qa).toHaveLength(1)
    expect(result.devops).toHaveLength(1)
  })

  it('should include agent IDs with project ID', async () => {
    const result = await getAgentPool({
      projectId: 'my-project',
      phase: 'requirements',
    })

    expect(result.pm[0].id).toBe('pm-my-project')
    expect(result.backend_dev[0].id).toBe('be-my-project')
  })
})

describe('Activity: getWorkflowState', () => {
  it('should return null as placeholder', async () => {
    const result = await getWorkflowState({ projectId: 'test-project' })
    expect(result).toBeNull()
  })
})

describe('Activity: saveWorkflowState', () => {
  it('should be a no-op placeholder', async () => {
    await expect(
      saveWorkflowState({
        projectId: 'test-project',
        paused: true,
        currentPhase: 'development',
      })
    ).resolves.toBeUndefined()
  })
})
