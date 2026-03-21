/**
 * SaaS Factory — Dynamic Multi-Agent Temporal Workflow
 *
 * Orchestrates the full 5-phase build pipeline with dynamic agent pools:
 *   requirements → architecture → development → testing → deployment
 *
 * Pool sizes come from project config (agentPoolSizes) set at project creation.
 * Agents of the same role within a phase run in parallel with distinct subtask slices.
 */

import { proxyActivities, setHandler, defineSignal, defineQuery, condition } from '@temporalio/workflow'
import type * as activities from './activities.js'

const {
  setupPhase,
  runAgentWork,
  runCollaborationRound,
  completePhase,
  completeProject,
  failProject,
  prepareDeployment,
  executeDeployment,
  getAgentPool,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30m',
  retry: {
    initialInterval: '5s',
    maximumInterval: '2m',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
})

export const pauseSignal = defineSignal('pause')
export const resumeSignal = defineSignal('resume')
export const deploySignal = defineSignal<[{ strategy: 'docker' | 'vercel' | 'static' }]>('deploy')
export const deploymentStatusQuery = defineQuery<{ status: string; url?: string; options?: unknown[] }>('deploymentStatus')

/** Build a parallel array of runAgentWork calls for all copies of a role */
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
  let chosenStrategy: 'docker' | 'vercel' | 'static' | null = null
  const deploymentState: { status: string; url?: string; options?: unknown[] } = { status: 'pending' }

  setHandler(pauseSignal, () => { paused = true })
  setHandler(resumeSignal, () => { paused = false })
  setHandler(deploySignal, ({ strategy }) => { chosenStrategy = strategy })
  setHandler(deploymentStatusQuery, () => deploymentState)

  async function waitIfPaused() {
    if (paused) await condition(() => !paused)
  }

  try {
    // ── Phase 1: Requirements (PM + BA pool in parallel) ───────────────────
    const { conversationId: reqConvId, metricsId: reqMetricsId } = await setupPhase({ projectId, phase: 'requirements' })
    const reqPool = await getAgentPool({ projectId, phase: 'requirements' })
    await Promise.all([
      runRoleParallel({ projectId, phase: 'requirements', role: 'pm', conversationId: reqConvId, metricsId: reqMetricsId, agentPool: reqPool.pm }),
      runRoleParallel({ projectId, phase: 'requirements', role: 'ba', conversationId: reqConvId, metricsId: reqMetricsId, agentPool: reqPool.ba }),
    ])
    await runCollaborationRound({ projectId, phase: 'requirements', conversationId: reqConvId, metricsId: reqMetricsId })
    await completePhase({ projectId, phase: 'requirements', conversationId: reqConvId, metricsId: reqMetricsId })
    await waitIfPaused()

    // ── Phase 2: Architecture (Architect pool first, then PM + collab parallel)
    const { conversationId: archConvId, metricsId: archMetricsId } = await setupPhase({ projectId, phase: 'architecture' })
    const archPool = await getAgentPool({ projectId, phase: 'architecture' })
    await runRoleParallel({ projectId, phase: 'architecture', role: 'architect', conversationId: archConvId, metricsId: archMetricsId, agentPool: archPool.architect })
    await Promise.all([
      runRoleParallel({ projectId, phase: 'architecture', role: 'pm', conversationId: archConvId, metricsId: archMetricsId, agentPool: archPool.pm }),
      runCollaborationRound({ projectId, phase: 'architecture', conversationId: archConvId, metricsId: archMetricsId }),
    ])
    await completePhase({ projectId, phase: 'architecture', conversationId: archConvId, metricsId: archMetricsId })
    await waitIfPaused()

    // ── Phase 3: Development (PM coord → FE pool + BE pool in parallel) ────
    const { conversationId: devConvId, metricsId: devMetricsId } = await setupPhase({ projectId, phase: 'development' })
    const devPool = await getAgentPool({ projectId, phase: 'development' })
    await runRoleParallel({ projectId, phase: 'development', role: 'pm', conversationId: devConvId, metricsId: devMetricsId, agentPool: devPool.pm })
    await Promise.all([
      runRoleParallel({ projectId, phase: 'development', role: 'frontend_dev', conversationId: devConvId, metricsId: devMetricsId, agentPool: devPool.frontend_dev }),
      runRoleParallel({ projectId, phase: 'development', role: 'backend_dev', conversationId: devConvId, metricsId: devMetricsId, agentPool: devPool.backend_dev }),
    ])
    await runCollaborationRound({ projectId, phase: 'development', conversationId: devConvId, metricsId: devMetricsId })
    await completePhase({ projectId, phase: 'development', conversationId: devConvId, metricsId: devMetricsId })
    await waitIfPaused()

    // ── Phase 4: Testing (QA pool → FE+BE fix pools in parallel → PM sign-off)
    const { conversationId: testConvId, metricsId: testMetricsId } = await setupPhase({ projectId, phase: 'testing' })
    const testPool = await getAgentPool({ projectId, phase: 'testing' })
    await runRoleParallel({ projectId, phase: 'testing', role: 'qa', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.qa })
    await Promise.all([
      runRoleParallel({ projectId, phase: 'testing', role: 'frontend_dev', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.frontend_dev }),
      runRoleParallel({ projectId, phase: 'testing', role: 'backend_dev', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.backend_dev }),
    ])
    await runRoleParallel({ projectId, phase: 'testing', role: 'pm', conversationId: testConvId, metricsId: testMetricsId, agentPool: testPool.pm })
    await completePhase({ projectId, phase: 'testing', conversationId: testConvId, metricsId: testMetricsId })
    await waitIfPaused()

    // ── Phase 5: Deployment (DevOps pool + PM in parallel) ────────────────
    const { conversationId: deployConvId, metricsId: deployMetricsId } = await setupPhase({ projectId, phase: 'deployment' })
    const deployPool = await getAgentPool({ projectId, phase: 'deployment' })
    await Promise.all([
      runRoleParallel({ projectId, phase: 'deployment', role: 'devops', conversationId: deployConvId, metricsId: deployMetricsId, agentPool: deployPool.devops }),
      runRoleParallel({ projectId, phase: 'deployment', role: 'pm', conversationId: deployConvId, metricsId: deployMetricsId, agentPool: deployPool.pm }),
    ])

    // Prepare deployment: detect stack and broadcast options to the user
    const deploymentPrep = await prepareDeployment({ projectId })
    deploymentState.status = 'awaiting_choice'
    deploymentState.options = deploymentPrep.options

    // Wait for user to choose a deployment strategy via signal, or auto-deploy
    await condition(() => chosenStrategy !== null, '5m')

    const strategy = chosenStrategy ?? (deploymentPrep.options.find(o => o.recommended)?.strategy as 'docker' | 'vercel' | 'static') ?? 'docker'

    deploymentState.status = 'deploying'
    const deployResult = await executeDeployment({ projectId, strategy })
    deploymentState.status = deployResult.success ? 'deployed' : 'failed'
    deploymentState.url = deployResult.url

    await completePhase({ projectId, phase: 'deployment', conversationId: deployConvId, metricsId: deployMetricsId })
    await completeProject({ projectId })
  } catch (err) {
    await failProject({ projectId, error: String(err) })
    throw err
  }
}
