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
 */

import { proxyActivities, setHandler, defineSignal, condition } from '@temporalio/workflow'
import type * as activities from './activities.js'

const {
  setupPhase,
  runAgentWork,
  runCollaborationRound,
  completePhase,
  completeProject,
  failProject,
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

export async function buildSaaSProject(input: { projectId: string }): Promise<void> {
  const { projectId } = input

  let paused = false
  setHandler(pauseSignal, () => { paused = true })
  setHandler(resumeSignal, () => { paused = false })

  async function waitIfPaused() {
    if (paused) await condition(() => !paused)
  }

  try {
    // ── Phase 1: Requirements ──────────────────────────────────────────────
    const { conversationId: reqConvId } = await setupPhase({ projectId, phase: 'requirements' })
    await runAgentWork({ projectId, phase: 'requirements', role: 'pm', conversationId: reqConvId })
    await runAgentWork({ projectId, phase: 'requirements', role: 'ba', conversationId: reqConvId })
    await runCollaborationRound({ projectId, phase: 'requirements', conversationId: reqConvId })
    await completePhase({ projectId, phase: 'requirements', conversationId: reqConvId })
    await waitIfPaused()

    // ── Phase 2: Architecture ──────────────────────────────────────────────
    const { conversationId: archConvId } = await setupPhase({ projectId, phase: 'architecture' })
    await runAgentWork({ projectId, phase: 'architecture', role: 'architect', conversationId: archConvId })
    await runAgentWork({ projectId, phase: 'architecture', role: 'pm', conversationId: archConvId })
    await runCollaborationRound({ projectId, phase: 'architecture', conversationId: archConvId })
    await completePhase({ projectId, phase: 'architecture', conversationId: archConvId })
    await waitIfPaused()

    // ── Phase 3: Development (FE + BE in parallel) ─────────────────────────
    const { conversationId: devConvId } = await setupPhase({ projectId, phase: 'development' })
    await runAgentWork({ projectId, phase: 'development', role: 'pm', conversationId: devConvId })
    await Promise.all([
      runAgentWork({ projectId, phase: 'development', role: 'frontend_dev', conversationId: devConvId }),
      runAgentWork({ projectId, phase: 'development', role: 'backend_dev', conversationId: devConvId }),
    ])
    await runCollaborationRound({ projectId, phase: 'development', conversationId: devConvId })
    await completePhase({ projectId, phase: 'development', conversationId: devConvId })
    await waitIfPaused()

    // ── Phase 4: Testing (QA → FE+BE fix in parallel → PM review) ─────────
    const { conversationId: testConvId } = await setupPhase({ projectId, phase: 'testing' })
    await runAgentWork({ projectId, phase: 'testing', role: 'qa', conversationId: testConvId })
    await Promise.all([
      runAgentWork({ projectId, phase: 'testing', role: 'frontend_dev', conversationId: testConvId }),
      runAgentWork({ projectId, phase: 'testing', role: 'backend_dev', conversationId: testConvId }),
    ])
    await runAgentWork({ projectId, phase: 'testing', role: 'pm', conversationId: testConvId })
    await completePhase({ projectId, phase: 'testing', conversationId: testConvId })
    await waitIfPaused()

    // ── Phase 5: Deployment ────────────────────────────────────────────────
    const { conversationId: deployConvId } = await setupPhase({ projectId, phase: 'deployment' })
    await runAgentWork({ projectId, phase: 'deployment', role: 'devops', conversationId: deployConvId })
    await runAgentWork({ projectId, phase: 'deployment', role: 'pm', conversationId: deployConvId })
    await completePhase({ projectId, phase: 'deployment', conversationId: deployConvId })

    await completeProject({ projectId })
  } catch (err) {
    await failProject({ projectId, error: String(err) })
    throw err
  }
}
