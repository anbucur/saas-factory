/**
 * SaaS Factory Workflow - Complete Redesign v2
 * 
 * Phase 1: PoC (Proof of Concept)
 *   Step 1: Requirements - PM briefs BAs, BAs document requirements
 *   Step 2: Analysis - BAs analyze requirements, create specs
 *   Step 3: Architecture - Solution Architect reviews, chooses stack, creates tasks
 *   Step 4: Development - Developers build, review each other's work
 *   Step 5: QA - QA engineers test, create bugs, devs fix them
 *   Step 6: POC Complete - Ready for review
 * 
 * Phase 2: Enhancement
 *   - User requests features
 *   - Same flow but stack is inherited (unless new components needed)
 * 
 * Phase 3: Security Strengthening
 *   - Security audit
 *   - Fix vulnerabilities
 *   - Harden deployment
 * 
 * Phase 4: Production
 *   - Final review
 *   - Deploy to production
 *   - Enable billing if applicable
 */

import { proxyActivities, workflowInfo } from '@temporalio/workflow'
import type * as activities from './activities'

const {
  pmBrief,
  baDocumentRequirements,
  baAnalyzeRequirements,
  architectReviewAndPlan,
  developerBuild,
  developerCodeReview,
  qaTest,
  developerFixBugs,
  enhanceFeature,
  securityAudit,
  securityHarden,
  deployProduction,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30m',
  retry: { maximumAttempts: 2 },
})

export interface Feature {
  name: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface Requirement {
  id: string
  feature: string
  description: string
  acceptanceCriteria: string[]
  status: 'pending' | 'in_progress' | 'done'
}

export interface Task {
  id: string
  title: string
  description: string
  assignee: 'dev1' | 'dev2'
  status: 'todo' | 'in_progress' | 'review' | 'done'
  subtasks: string[]
}

export interface Sprint {
  id: string
  name: string
  tasks: Task[]
  duration: number // minutes
}

export interface BuildSpec {
  name: string
  description: string
  features: Feature[]
  billingMode: 'subscription' | 'usage' | 'none'
}

export interface BuildResult {
  success: boolean
  url?: string
  error?: string
  sprintsCompleted?: number
}

/**
 * Main SaaS Build Workflow
 */
export async function buildSaaS(spec: BuildSpec): Promise<BuildResult> {
  const buildId = workflowInfo().workflowId
  console.log(`[${buildId}] Starting SaaS build: ${spec.name}`)

  try {
    // ========================================================================
    // PHASE 1: POC - Proof of Concept
    // ========================================================================
    console.log('[Phase 1] Starting POC - Requirements & Development')

    // Step 1: PM briefs BAs on features
    console.log('[Step 1] PM briefing BAs...')
    const briefing = await pmBrief({
      projectName: spec.name,
      features: spec.features,
      buildId,
    })
    console.log(`[Step 1] PM briefing complete: ${briefing.briefingDocument}`)

    // Step 2: BAs document requirements
    console.log('[Step 2] BAs documenting requirements...')
    const requirements = await baDocumentRequirements({
      briefing: briefing.briefingDocument,
      buildId,
    })
    console.log(`[Step 2] Documented ${requirements.requirements.length} requirements`)

    // Step 3: BAs analyze requirements (parallel for speed)
    console.log('[Step 3] BAs analyzing requirements...')
    const analysis = await baAnalyzeRequirements({
      requirements: requirements.requirements,
      buildId,
    })
    console.log(`[Step 3] Analysis complete: ${analysis.analysisSummary}`)

    // Step 4: Solution Architect reviews and creates tasks
    console.log('[Step 4] Solution Architect reviewing...')
    const architecture = await architectReviewAndPlan({
      analysis: analysis.analysisSummary,
      buildId,
    })
    console.log(`[Step 4] Architecture: ${architecture.stack.join(', ')}`)
    console.log(`[Step 4] Created ${architecture.sprints.length} sprints with tasks`)

    // Step 5: Development with Code Reviews (iterate through sprints)
    console.log('[Step 5] Starting development sprints...')
    let allTasksComplete = true
    
    for (const sprint of architecture.sprints) {
      console.log(`[Sprint ${sprint.id}] ${sprint.name} - ${sprint.tasks.length} tasks`)
      
      // Assign tasks to developers
      const dev1Tasks = sprint.tasks.filter(t => t.assignee === 'dev1')
      const dev2Tasks = sprint.tasks.filter(t => t.assignee === 'dev2')
      
      // Developers work in parallel
      const [dev1Result, dev2Result] = await Promise.all([
        developerBuild({ tasks: dev1Tasks, sprintId: sprint.id, buildId }),
        developerBuild({ tasks: dev2Tasks, sprintId: sprint.id, buildId }),
      ])
      
      console.log(`[Sprint ${sprint.id}] Development complete: ${dev1Result.tasksBuilt} + ${dev2Result.tasksBuilt} tasks`)
      
      // Code reviews
      await developerCodeReview({
        codeChanges: [...dev1Result.changes, ...dev2Result.changes],
        sprintId: sprint.id,
        buildId,
      })
      console.log(`[Sprint ${sprint.id}] Code review complete`)
    }

    // Step 6: QA Testing
    console.log('[Step 6] QA testing...')
    let bugsFound = true
    let iteration = 0
    const maxQAIterations = 3
    
    while (bugsFound && iteration < maxQAIterations) {
      iteration++
      console.log(`[QA Iteration ${iteration}] Testing functionality...`)
      
      const qaResult = await qaTest({
        buildId,
        testScope: 'full',
      })
      
      if (qaResult.bugs.length > 0) {
        console.log(`[QA] Found ${qaResult.bugs.length} bugs`)
        
        // Devs fix bugs
        const fixResult = await developerFixBugs({
          bugs: qaResult.bugs,
          buildId,
        })
        console.log(`[QA] Fixed ${fixResult.fixedCount} bugs`)
        
        bugsFound = fixResult.unfixedCount === 0 ? false : true
      } else {
        console.log('[QA] No bugs found - all clear!')
        bugsFound = false
      }
    }

    console.log('[Phase 1] POC Complete - Ready for enhancement')

    // ========================================================================
    // PHASE 2: Enhancement (if requested)
    // ========================================================================
    // Enhancement happens when user requests new features
    // For now, we'll skip automatic enhancement unless features array has more items
    // This would be triggered by user input in a real scenario

    // ========================================================================
    // PHASE 3: Security
    // ========================================================================
    console.log('[Phase 3] Security hardening...')
    
    const securityAuditResult = await securityAudit({
      buildId,
      scope: 'full',
    })
    
    if (securityAuditResult.issues.length > 0) {
      console.log(`[Security] Found ${securityAuditResult.issues.length} issues`)
      
      await securityHarden({
        issues: securityAuditResult.issues,
        buildId,
      })
      console.log('[Security] Issues fixed and hardened')
    }

    // ========================================================================
    // PHASE 4: Production
    // ========================================================================
    console.log('[Phase 4] Deploying to production...')
    
    const deployResult = await deployProduction({
      buildId,
      billingMode: spec.billingMode,
    })
    
    console.log(`✅ Build complete: ${deployResult.url}`)
    return {
      success: true,
      url: deployResult.url,
      sprintsCompleted: architecture.sprints.length,
    }

  } catch (error) {
    console.error('[Workflow] Build failed:', error)
    return {
      success: false,
      error: String(error),
    }
  }
}
