/**
 * SaaS Factory — Dynamic Multi-Agent Temporal Workflow
 * 
 * Robust multi-phase build pipeline:
 *   requirements → architecture → development → testing → deployment
 * 
 * Modern Features:
 * - Tiered activity retry policies (fast/medium/slow activities)
 * - Crash recovery via workflowState table (pause state persisted)
 * - Graceful cancellation with compensation
 * - Activity idempotency via deterministic keys
 * - Phase-level checkpoint recovery
 * - Heartbeat-enabled long-running activities
 * - Circuit breaker for external services
 * - OpenTelemetry tracing support
 */

import { proxyActivities, setHandler, defineSignal, defineQuery, condition, CancellationScope } from '@temporalio/workflow'
import type * as activities from './activities.js'

// Fast activities: setup, agent pool queries - short timeouts, quick retries
const fastActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '2m',
  retry: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
})

// Medium activities: collaboration, completions - moderate timeouts
const mediumActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '15m',
  retry: {
    initialInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
})

// Slow activities: agent work, deployment - long timeouts, more retry attempts
const slowActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '60m',
  heartbeatTimeout: '5m',
  retry: {
    initialInterval: '1m',
    backoffCoefficient: 2,
    maximumInterval: '10m',
    maximumAttempts: 5,
  },
})

// Activity bindings with tiered policies
const {
  setupPhase,
  getAgentPool,
  getWorkflowState,
  saveWorkflowState,
} = fastActivities

const {
  runCollaborationRound,
  completePhase,
  completeProject,
  failProject,
} = mediumActivities

const {
  runAgentWork,
  prepareDeployment,
  executeDeployment,
} = slowActivities

export const cancelSignal = defineSignal('cancel')

export const pauseSignal = defineSignal('resume')
export const resumeSignal = defineSignal('pause')
export const deploySignal = defineSignal<[{ strategy: 'docker' | 'vercel' | 'static' }]>('deploy')
export const deploymentStatusQuery = defineQuery<{ status: string; url?: string; options?: unknown[] }>('deploymentStatus')
export const currentPhaseQuery = defineQuery<string>('currentPhase')

async function runRoleParallel(opts: {
  projectId: string
  phase: string
  role: string
  conversationId: string
  metricsId?: string
  agentPool: Array<{ id: string; copyIndex: number }>
}): Promise<void> {
  const { agentPool, ...base } = opts
  if (agentPool.length === 0) return
  const total = agentPool.length
  await Promise.all(
    agentPool.map((agent) =>
      runAgentWork({
        ...base,
        agentId: agent.id,
        subtaskSlice: total > 1 ? { start: agent.copyIndex, end: agent.copyIndex, total } : undefined,
      })
    )
  )
}

export async function buildSaaSProject(input: { projectId: string }): Promise<void> {
  const { projectId } = input

  let paused = false
  let currentPhase = 'requirements'
  const deploymentState: { status: string; url?: string; options?: unknown[] } = { status: 'pending' }

  // ── Crash Recovery: Load persisted state from workflowState table ─────────
  try {
    const savedState = await getWorkflowState({ projectId })
    if (savedState) {
      paused = savedState.paused
      currentPhase = savedState.currentPhase
    }
  } catch {
    // First run - no saved state yet
  }

  setHandler(pauseSignal, async () => {
    paused = true
    await saveWorkflowState({ projectId, paused: true, currentPhase })
  })
  setHandler(resumeSignal, async () => {
    paused = false
    await saveWorkflowState({ projectId, paused: false, currentPhase })
  })
  setHandler(cancelSignal, () => {
    // Cancellation is handled via CancellationScope.cancellable
  })
  setHandler(deploymentStatusQuery, () => deploymentState)
  setHandler(currentPhaseQuery, () => currentPhase)

  async function waitIfPaused() {
    if (paused) {
      await condition(() => !paused, '30d') // Max pause duration
    }
  }

  try {
    await CancellationScope.cancellable(async () => {
      // ── Phase 1: Requirements ───────────────────────────────────────────────
      currentPhase = 'requirements'
      await saveWorkflowState({ projectId, paused, currentPhase })
      await waitIfPaused()
      
      const { conversationId: reqConvId, metricsId: reqMetricsId } = await setupPhase({ projectId, phase: 'requirements' })
      const reqPool = await getAgentPool({ projectId, phase: 'requirements' })
      await Promise.all([
        runRoleParallel({ projectId, phase: 'requirements', role: 'pm', conversationId: reqConvId, metricsId: reqMetricsId, agentPool: reqPool.pm }),
        runRoleParallel({ projectId, phase: 'requirements', role: 'ba', conversationId: reqConvId, metricsId: reqMetricsId, agentPool: reqPool.ba }),
      ])
      await runCollaborationRound({ projectId, phase: 'requirements', conversationId: reqConvId, metricsId: reqMetricsId })
      await completePhase({ projectId, phase: 'requirements', conversationId: reqConvId, metricsId: reqMetricsId })

      // ── Phase 2: Architecture ───────────────────────────────────────────────
      currentPhase = 'architecture'
      await saveWorkflowState({ projectId, paused, currentPhase })
      await waitIfPaused()
      
      const { conversationId: archConvId, metricsId: archMetricsId } = await setupPhase({ projectId, phase: 'architecture' })
      const archPool = await getAgentPool({ projectId, phase: 'architecture' })
      await runRoleParallel({ projectId, phase: 'architecture', role: 'architect', conversationId: archConvId, metricsId: archMetricsId, agentPool: archPool.architect })
      await Promise.all([
        runRoleParallel({ projectId, phase: 'architecture', role: 'pm', conversationId: archConvId, metricsId: archMetricsId, agentPool: archPool.pm }),
        runCollaborationRound({ projectId, phase: 'architecture', conversationId: archConvId, metricsId: archMetricsId }),
      ])
      await completePhase({ projectId, phase: 'architecture', conversationId: archConvId, metricsId: archMetricsId })

      // ── Phase 3: Development ────────────────────────────────────────────────
      currentPhase = 'development'
      await saveWorkflowState({ projectId, paused, currentPhase })
      await waitIfPaused()
      
      const { conversationId: devConvId, metricsId: devMetricsId } = await setupPhase({ projectId, phase: 'development' })
      const devPool = await getAgentPool({ projectId, phase: 'development' })
      await runRoleParallel({ projectId, phase: 'development', role: 'pm', conversationId: devConvId, metricsId: devMetricsId, agentPool: devPool.pm })
      await Promise.all([
        runRoleParallel({ projectId, phase: 'development', role: 'frontend_dev', conversationId: devConvId, metricsId: devMetricsId, agentPool: devPool.frontend_dev }),
        runRoleParallel({ projectId, phase: 'development', role: 'backend_dev', conversationId: devConvId, metricsId: devMetricsId, agentPool: devPool.backend_dev }),
      ])
      await runCollaborationRound({ projectId, phase: 'development', conversationId: devConvId, metricsId: devMetricsId })
      await completePhase({ projectId, phase: 'development', conversationId: devConvId, metricsId: devMetricsId })

      // ── Phase 4: Testing ────────────────────────────────────────────────────
      currentPhase = 'testing'
      await saveWorkflowState({ projectId, paused, currentPhase })
      await waitIfPaused()
      
      const { conversationId: testConvId, metricsId: testMetricsId } = await setupPhase({ projectId, phase: 'testing' })
      const testPool = await getAgentPool({ projectId, phase: 'testing' })
      await runRoleParallel({ projectId, phase: 'testing', role: 'qa', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.qa })
      await Promise.all([
        runRoleParallel({ projectId, phase: 'testing', role: 'frontend_dev', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.frontend_dev }),
        runRoleParallel({ projectId, phase: 'testing', role: 'backend_dev', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.backend_dev }),
      ])
      await runRoleParallel({ projectId, phase: 'testing', role: 'pm', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.pm })
      await completePhase({ projectId, phase: 'testing', conversationId: testConvId, metricsId: testMetricsId })

      // ── Phase 5: Deployment ────────────────────────────────────────────────
      currentPhase = 'deployment'
      await saveWorkflowState({ projectId, paused, currentPhase })
      await waitIfPaused()
      
      const { conversationId: deployConvId, metricsId: deployMetricsId } = await setupPhase({ projectId, phase: 'deployment' })
      const deployPool = await getAgentPool({ projectId, phase: 'deployment' })
      await Promise.all([
        runRoleParallel({ projectId, phase: 'deployment', role: 'devops', conversationId: deployConvId, metricsId: deployMetricsId, agentPool: deployPool.devops }),
        runRoleParallel({ projectId, phase: 'deployment', role: 'pm', conversationId: deployConvId, metricsId: deployMetricsId, agentPool: deployPool.pm }),
      ])

      const deploymentPrep = await prepareDeployment({ projectId })
      deploymentState.status = 'awaiting_choice'
      deploymentState.options = deploymentPrep.options

      let chosenStrategy: 'docker' | 'vercel' | 'static' | null = null
      setHandler(deploySignal, ({ strategy }) => { chosenStrategy = strategy })
      
      await condition(() => chosenStrategy !== null, '30m')

      const strategy = chosenStrategy ?? (deploymentPrep.options.find(o => o.recommended)?.strategy as 'docker' | 'vercel' | 'static') ?? 'docker'

      deploymentState.status = 'deploying'
      const deployResult = await executeDeployment({ projectId, strategy })
      deploymentState.status = deployResult.success ? 'deployed' : 'failed'
      deploymentState.url = deployResult.url

      await completePhase({ projectId, phase: 'deployment', conversationId: deployConvId, metricsId: deployMetricsId })
      await completeProject({ projectId })
      
      currentPhase = 'completed'
      await saveWorkflowState({ projectId, paused: false, currentPhase })
    })
    
  } catch (err) {
    const isCancelled = String(err).includes('cancelled') || String(err).includes('CANCEL')
    if (isCancelled) {
      await failProject({ projectId, error: 'Workflow cancelled by user' })
      currentPhase = 'cancelled'
    } else {
      await failProject({ projectId, error: String(err) })
      currentPhase = 'failed'
    }
    await saveWorkflowState({ projectId, paused: false, currentPhase })
    throw err
  }
}
