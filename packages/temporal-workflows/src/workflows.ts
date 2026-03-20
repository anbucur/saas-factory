import type { Workflow } from '@temporalio/workflow'
import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

// Configure activity timeouts
const { scaffoldApp, buildUI, enhanceFeatures, securityScan, fixSecurityIssues, injectBilling, deployApp } =
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
 * Main SaaS build workflow - orchestrates all phases
 */
export async function buildSaaS(spec: BuildSpec): Promise<BuildResult> {
  console.log(`Starting build for: ${spec.name}`)

  try {
    // === Phase 1: PoC - Scaffold + Basic UI ===
    console.log('[Phase 1] PoC - Scaffolding application...')
    const scaffoldResult = await scaffoldApp({
      name: spec.name,
      description: spec.description,
      features: spec.features,
    })

    console.log('[Phase 1] Building UI...')
    await buildUI({ appId: scaffoldResult.appId })

    // === Phase 2: Enhancement ===
    console.log('[Phase 2] Enhancing features...')
    const enhancements = await Promise.all(
      spec.features.map((feature) =>
        enhanceFeatures({ appId: scaffoldResult.appId, feature })
      )
    )

    // === Phase 3: Security ===
    console.log('[Phase 3] Security scan...')
    const securityResults = await securityScan({ appId: scaffoldResult.appId })

    if (securityResults.issues.length > 0) {
      console.log(`[Phase 3] Found ${securityResults.issues.length} issues, fixing...`)
      await fixSecurityIssues({ appId: scaffoldResult.appId, issues: securityResults.issues })
    }

    // === Phase 4: Billing + Deploy ===
    if (spec.billingMode !== 'none') {
      console.log('[Phase 4] Injecting billing...')
      await injectBilling({
        appId: scaffoldResult.appId,
        mode: spec.billingMode,
      })
    }

    console.log('[Phase 4] Deploying to production...')
    const deployResult = await deployApp({ appId: scaffoldResult.appId })

    console.log(`✅ Build complete: ${deployResult.url}`)
    return { success: true, url: deployResult.url }
  } catch (error) {
    console.error('Build failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Parallel feature enhancement - multiple features enhanced simultaneously
 */
export async function enhanceMultipleFeatures(
  appId: string,
  features: string[]
): Promise<{ results: string[] }> {
  const results = await Promise.all(
    features.map((feature) =>
      enhanceFeatures({ appId, feature }).then((r) => r.status)
    )
  )

  return { results }
}
