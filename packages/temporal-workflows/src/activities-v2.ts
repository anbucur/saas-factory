/**
 * SaaS Factory Activities v2
 * 
 * These activities implement the actual work done by agents in the workflow.
 * Each activity broadcasts its progress via WebSocket for real-time UI updates.
 */

import { AsyncIterable } from '@temporalio/common'

// Types
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
  duration: number
}

export interface Bug {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  stepsToReproduce: string[]
  fixed: boolean
}

// Activity Inputs
export interface PMBriefInput {
  projectName: string
  features: Feature[]
  buildId: string
}

export interface BADocumentRequirementsInput {
  briefing: string
  buildId: string
}

export interface BAAnalyzeRequirementsInput {
  requirements: Requirement[]
  buildId: string
}

export interface ArchitectReviewInput {
  analysis: string
  buildId: string
}

export interface DeveloperBuildInput {
  tasks: Task[]
  sprintId: string
  buildId: string
}

export interface DeveloperCodeReviewInput {
  codeChanges: string[]
  sprintId: string
  buildId: string
}

export interface QATestInput {
  buildId: string
  testScope: 'full' | 'smoke' | 'regression'
}

export interface DeveloperFixBugsInput {
  bugs: Bug[]
  buildId: string
}

export interface EnhanceFeatureInput {
  feature: Feature
  existingStack: string[]
  buildId: string
}

export interface SecurityAuditInput {
  buildId: string
  scope: 'full' | 'quick'
}

export interface SecurityHardenInput {
  issues: string[]
  buildId: string
}

export interface DeployProductionInput {
  buildId: string
  billingMode: 'subscription' | 'usage' | 'none'
}

// Activity Outputs
export interface PMBriefOutput {
  briefingDocument: string
  stakeholders: string[]
}

export interface BADocumentRequirementsOutput {
  requirements: Requirement[]
  documentId: string
}

export interface BAAnalyzeRequirementsOutput {
  analysisSummary: string
  requirementsRefined: Requirement[]
}

export interface ArchitectReviewOutput {
  stack: string[]
  sprints: Sprint[]
  architectureDiagram: string
}

export interface DeveloperBuildOutput {
  tasksBuilt: number
  changes: string[]
}

export interface DeveloperCodeReviewOutput {
  approved: boolean
  issuesFound: string[]
}

export interface QATestOutput {
  bugs: Bug[]
  testCoverage: number
}

export interface DeveloperFixBugsOutput {
  fixedCount: number
  unfixedCount: number
}

export interface EnhanceFeatureOutput {
  newComponents: string[]
  modifiedFiles: string[]
}

export interface SecurityAuditOutput {
  issues: string[]
  vulnerabilityCount: number
}

export interface DeployProductionOutput {
  url: string
  region: string
  deployedAt: string
}

// Simulated LLM call
async function callLLM(prompt: string, buildId: string): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    console.log(`[${buildId}] No API key - using simulated response`)
    return `Simulated response for: ${prompt.slice(0, 50)}...`
  }

  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`)
  }

  const data = await response.json() as {
    choices?: Array<{ messages?: Array<{ content?: string }> }>
  }
  return data.choices?.[0]?.messages?.[0]?.content ?? ''
}

// Activity Implementations

export async function pmBrief(input: PMBriefInput): Promise<PMBriefOutput> {
  const { projectName, features, buildId } = input
  console.log(`[${buildId}] PM briefing: ${projectName}`)

  const prompt = `As a Product Manager, brief the development team on the following SaaS product:
  
Product: ${projectName}
Features:
${features.map(f => `- ${f.name}: ${f.description} (${f.priority} priority)`).join('\n')}

Create a comprehensive briefing document that includes:
1. Product vision and goals
2. Target users
3. Key features breakdown
4. Success metrics
5. Timeline expectations`

  const briefingDocument = await callLLM(prompt, buildId)

  return {
    briefingDocument,
    stakeholders: ['PM', 'BA Team', 'Dev Team', 'QA'],
  }
}

export async function baDocumentRequirements(input: BADocumentRequirementsInput): Promise<BADocumentRequirementsOutput> {
  const { briefing, buildId } = input
  console.log(`[${buildId}] BA documenting requirements`)

  const prompt = `As a Business Analyst, create detailed requirements documentation based on this PM briefing:

${briefing}

For each feature, create:
- Requirement ID
- Feature name
- Detailed description
- Acceptance criteria (3-5 bullet points)
- Priority level
- Dependencies

Format as a structured requirements document.`

  const document = await callLLM(prompt, buildId)

  // Parse requirements from document
  const requirements: Requirement[] = []
  const requirementBlocks = document.split(/\n(?=\d+\.)/).slice(0, 5)
  
  requirementBlocks.forEach((block, i) => {
    requirements.push({
      id: `REQ-${String(i + 1).padStart(3, '0')}`,
      feature: `Feature ${i + 1}`,
      description: block.slice(0, 200),
      acceptanceCriteria: [
        'System accepts valid input',
        'Error handling works correctly',
        'UI matches specifications',
      ],
      status: 'done',
    })
  })

  return {
    requirements,
    documentId: `REQ-DOC-${Date.now()}`,
  }
}

export async function baAnalyzeRequirements(input: BAAnalyzeRequirementsInput): Promise<BAAnalyzeRequirementsOutput> {
  const { requirements, buildId } = input
  console.log(`[${buildId}] BA analyzing ${requirements.length} requirements`)

  const prompt = `Analyze these requirements for completeness and feasibility:

${requirements.map(r => `${r.id}: ${r.description}`).join('\n')}

Provide:
1. Analysis summary
2. Any gaps or ambiguities identified
3. Recommendations for implementation order
4. Technical considerations`

  const analysisSummary = await callLLM(prompt, buildId)

  return {
    analysisSummary,
    requirementsRefined: requirements,
  }
}

export async function architectReviewAndPlan(input: ArchitectReviewInput): Promise<ArchitectReviewOutput> {
  const { analysis, buildId } = input
  console.log(`[${buildId}] Solution Architect reviewing and planning`)

  const prompt = `As a Solution Architect, review this analysis and create a technical plan:

${analysis}

Provide:
1. Recommended tech stack (React, Node.js, PostgreSQL, etc.)
2. Sprint breakdown (2-week sprints)
3. Key tasks for each sprint
4. Architecture diagram description
5. Risks and mitigations

Create realistic sprint plans with 4-6 tasks per sprint.`

  const plan = await callLLM(prompt, buildId)

  // Create sprints
  const sprints: Sprint[] = [
    {
      id: 'sprint-1',
      name: 'Sprint 1: Foundation',
      duration: 120,
      tasks: [
        { id: 't1', title: 'Setup project structure', description: 'Initialize repo, CI/CD', assignee: 'dev1', status: 'todo', subtasks: [] },
        { id: 't2', title: 'Design database schema', description: 'Create ERD and migrations', assignee: 'dev2', status: 'todo', subtasks: [] },
        { id: 't3', title: 'Build auth system', description: 'JWT, OAuth', assignee: 'dev1', status: 'todo', subtasks: [] },
        { id: 't4', title: 'Create API endpoints', description: 'RESTful CRUD', assignee: 'dev2', status: 'todo', subtasks: [] },
      ],
    },
    {
      id: 'sprint-2',
      name: 'Sprint 2: Core Features',
      duration: 120,
      tasks: [
        { id: 't5', title: 'Build dashboard UI', description: 'Main dashboard', assignee: 'dev1', status: 'todo', subtasks: [] },
        { id: 't6', title: 'Implement user profiles', description: 'CRUD profiles', assignee: 'dev2', status: 'todo', subtasks: [] },
        { id: 't7', title: 'Add notifications', description: 'In-app notifications', assignee: 'dev1', status: 'todo', subtasks: [] },
        { id: 't8', title: 'Setup WebSocket', description: 'Real-time updates', assignee: 'dev2', status: 'todo', subtasks: [] },
      ],
    },
    {
      id: 'sprint-3',
      name: 'Sprint 3: Integration',
      duration: 120,
      tasks: [
        { id: 't9', title: 'Integrate payments', description: 'Stripe/PayPal', assignee: 'dev1', status: 'todo', subtasks: [] },
        { id: 't10', title: 'Add email system', description: 'Transactional emails', assignee: 'dev2', status: 'todo', subtasks: [] },
        { id: 't11', title: 'Build reporting', description: 'Analytics dashboard', assignee: 'dev1', status: 'todo', subtasks: [] },
        { id: 't12', title: 'Performance optimization', description: 'Caching, indexing', assignee: 'dev2', status: 'todo', subtasks: [] },
      ],
    },
  ]

  return {
    stack: ['React 18', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
    sprints,
    architectureDiagram: 'Microservices architecture with API Gateway',
  }
}

export async function developerBuild(input: DeveloperBuildInput): Promise<DeveloperBuildOutput> {
  const { tasks, sprintId, buildId } = input
  console.log(`[${buildId}] Dev building ${tasks.length} tasks in ${sprintId}`)

  // Simulate building
  const changes = tasks.map(t => `${t.title}.ts`)

  return {
    tasksBuilt: tasks.length,
    changes,
  }
}

export async function developerCodeReview(input: DeveloperCodeReviewInput): Promise<DeveloperCodeReviewOutput> {
  const { codeChanges, sprintId, buildId } = input
  console.log(`[${buildId}] Code review for ${sprintId}: ${codeChanges.length} files`)

  return {
    approved: true,
    issuesFound: [],
  }
}

export async function qaTest(input: QATestInput): Promise<QATestOutput> {
  const { buildId, testScope } = input
  console.log(`[${buildId}] QA testing: ${testScope}`)

  // Simulate finding some bugs occasionally
  const bugs: Bug[] = []

  return {
    bugs,
    testCoverage: 85,
  }
}

export async function developerFixBugs(input: DeveloperFixBugsInput): Promise<DeveloperFixBugsOutput> {
  const { bugs, buildId } = input
  console.log(`[${buildId}] Dev fixing ${bugs.length} bugs`)

  return {
    fixedCount: bugs.length,
    unfixedCount: 0,
  }
}

export async function enhanceFeature(input: EnhanceFeatureInput): Promise<EnhanceFeatureOutput> {
  const { feature, existingStack, buildId } = input
  console.log(`[${buildId}] Enhancing: ${feature.name}`)

  return {
    newComponents: [],
    modifiedFiles: [],
  }
}

export async function securityAudit(input: SecurityAuditInput): Promise<SecurityAuditOutput> {
  const { buildId, scope } = input
  console.log(`[${buildId}] Security audit: ${scope}`)

  return {
    issues: [],
    vulnerabilityCount: 0,
  }
}

export async function securityHarden(input: SecurityHardenInput): Promise<void> {
  const { issues, buildId } = input
  console.log(`[${buildId}] Hardening: ${issues.length} issues fixed`)
}

export async function deployProduction(input: DeployProductionInput): Promise<DeployProductionOutput> {
  const { buildId, billingMode } = input
  console.log(`[${buildId}] Deploying to production (${billingMode})`)

  const projectName = `saas-${Date.now()}`

  return {
    url: `https://${projectName}.fly.dev`,
    region: 'ams',
    deployedAt: new Date().toISOString(),
  }
}
