import { proxyActivities, workflowInfo } from '@temporalio/workflow'
import type * as activities from './activities'

// All activities share the same proxy config: 10 min timeout, 3 retries
const { generateSpec, scaffoldProject, writeCode, buildUI, runTests, deploy } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '10m',
    retry: { maximumAttempts: 3 },
  })

export interface BuildSpec {
  name: string
  description: string
  features: string[]
  billingMode: 'subscription' | 'usage' | 'none'
}

export interface BuildResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Main SaaS build workflow — orchestrates 4 sequential phases:
 *   PoC (generateSpec → scaffoldProject)
 *   Enhance (writeCode → buildUI)
 *   Security (runTests)
 *   Prod (deploy)
 *
 * The workflowId is used as the buildId so every broadcast event carries
 * the same identifier the frontend receives from POST /api/builds.
 */
export async function buildSaaS(spec: BuildSpec): Promise<BuildResult> {
  const buildId = workflowInfo().workflowId
  const projectName = spec.name.toLowerCase().replace(/\s+/g, '-')

  try {
    // === Phase 1: PoC ===
    const specResult = await generateSpec({
      name: spec.name,
      description: spec.description,
      features: spec.features,
      buildId,
    })

    const scaffoldResult = await scaffoldProject({
      projectName,
      spec: specResult.spec,
      buildId,
    })

    // === Phase 2: Enhance ===
    await writeCode({
      projectPath: scaffoldResult.projectPath,
      spec: specResult.spec,
      buildId,
    })

    await buildUI({
      projectPath: scaffoldResult.projectPath,
      buildId,
    })

    // === Phase 3: Security ===
    const testResult = await runTests({
      projectPath: scaffoldResult.projectPath,
      buildId,
    })

    if (!testResult.passed) {
      console.warn(`[${buildId.slice(0, 8)}] Tests did not fully pass: ${testResult.checks.join(', ')}`)
    }

    // === Phase 4: Prod ===
    const deployResult = await deploy({ projectName, buildId })

    console.log(`✅ Build complete: ${deployResult.url}`)
    return { success: true, url: deployResult.url }
  } catch (error) {
    console.error('Build failed:', error)
    return { success: false, error: String(error) }
  }
}
