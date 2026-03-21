/**
 * SaaS Factory - Single Temporal Workflow
 *
 * Orchestrates the full 5-phase, 7-agent build pipeline:
 *   requirements → architecture → development → testing → deployment
 *
 * Features:
 * - Automatic retry (3 attempts, exponential backoff) for every activity
 * - Pause/resume via Temporal signals
 * - FE dev + BE dev run in parallel during development
 * - FE dev + BE dev run in parallel during bug fixes in testing
 * - PM collaboration review after each phase
 * - Phase metrics tracking (duration, agent performance)
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
    // ── Phase 1: Requirements ──────────────────────────────────────────────
    const { conversationId: reqConvId, metricsId: reqMetricsId } = await setupPhase({ projectId, phase: 'requirements' })
    await runAgentWork({ projectId, phase: 'requirements', role: 'pm', conversationId: reqConvId, metricsId: reqMetricsId })
    await runAgentWork({ projectId, phase: 'requirements', role: 'ba', conversationId: reqConvId, metricsId: reqMetricsId })
    await runCollaborationRound({ projectId, phase: 'requirements', conversationId: reqConvId, metricsId: reqMetricsId })
    await completePhase({ projectId, phase: 'requirements', conversationId: reqConvId, metricsId: reqMetricsId })
    await waitIfPaused()

    // ── Phase 2: Architecture ──────────────────────────────────────────────
    const { conversationId: archConvId, metricsId: archMetricsId } = await setupPhase({ projectId, phase: 'architecture' })
    await runAgentWork({ projectId, phase: 'architecture', role: 'architect', conversationId: archConvId, metricsId: archMetricsId })
    await runAgentWork({ projectId, phase: 'architecture', role: 'pm', conversationId: archConvId, metricsId: archMetricsId })
    await runCollaborationRound({ projectId, phase: 'architecture', conversationId: archConvId, metricsId: archMetricsId })
    await completePhase({ projectId, phase: 'architecture', conversationId: archConvId, metricsId: archMetricsId })
    await waitIfPaused()

    // ── Phase 3: Development (FE + BE in parallel) ─────────────────────────
    const { conversationId: devConvId, metricsId: devMetricsId } = await setupPhase({ projectId, phase: 'development' })
    await runAgentWork({ projectId, phase: 'development', role: 'pm', conversationId: devConvId, metricsId: devMetricsId })
    await Promise.all([
      runAgentWork({ projectId, phase: 'development', role: 'frontend_dev', conversationId: devConvId, metricsId: devMetricsId }),
      runAgentWork({ projectId, phase: 'development', role: 'backend_dev', conversationId: devConvId, metricsId: devMetricsId }),
    ])
    await runCollaborationRound({ projectId, phase: 'development', conversationId: devConvId, metricsId: devMetricsId })
    await completePhase({ projectId, phase: 'development', conversationId: devConvId, metricsId: devMetricsId })
    await waitIfPaused()

    // ── Phase 4: Testing (QA → FE+BE fix in parallel → PM review) ─────────
    const { conversationId: testConvId, metricsId: testMetricsId } = await setupPhase({ projectId, phase: 'testing' })
    await runAgentWork({ projectId, phase: 'testing', role: 'qa', conversationId: testConvId, metricsId: testMetricsId })
    await Promise.all([
      runAgentWork({ projectId, phase: 'testing', role: 'frontend_dev', conversationId: testConvId, metricsId: testMetricsId }),
      runAgentWork({ projectId, phase: 'testing', role: 'backend_dev', conversationId: testConvId, metricsId: testMetricsId }),
    ])
    await runAgentWork({ projectId, phase: 'testing', role: 'pm', conversationId: testConvId, metricsId: testMetricsId })
    await completePhase({ projectId, phase: 'testing', conversationId: testConvId, metricsId: testMetricsId })
    await waitIfPaused()

    // ── Phase 5: Deployment ────────────────────────────────────────────────
    const { conversationId: deployConvId, metricsId: deployMetricsId } = await setupPhase({ projectId, phase: 'deployment' })
    await runAgentWork({ projectId, phase: 'deployment', role: 'devops', conversationId: deployConvId, metricsId: deployMetricsId })
    await runAgentWork({ projectId, phase: 'deployment', role: 'pm', conversationId: deployConvId, metricsId: deployMetricsId })

    // Prepare deployment: detect stack and broadcast options to the user
    const deploymentPrep = await prepareDeployment({ projectId })
    deploymentState.status = 'awaiting_choice'
    deploymentState.options = deploymentPrep.options

    // Wait for user to choose a deployment strategy via signal, or auto-deploy with Docker
    // If no signal received within 5 minutes, auto-deploy with the recommended strategy
    const gotSignal = await condition(() => chosenStrategy !== null, '5m')

    const strategy = chosenStrategy ?? (deploymentPrep.options.find(o => o.recommended)?.strategy as 'docker' | 'vercel' | 'static') ?? 'docker'

    // Execute the chosen deployment
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
