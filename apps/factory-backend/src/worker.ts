/**
 * Temporal Worker for SaaS Factory
 *
 * Registers all activity implementations and connects to the Temporal server.
 * Activities contain the actual agent orchestration logic (LLM calls, DB writes,
 * WebSocket broadcasts) that was previously in AgentEngine.
 *
 * The broadcast function is injected by index.ts via setBroadcast() before
 * the worker starts, allowing activities to push real-time events to clients.
 */

import { createRequire } from 'node:module'
import { Worker } from '@temporalio/worker'
import { v4 as uuid } from 'uuid'
import { db } from './db/index.js'
import {
  projects,
  agents,
  conversations,
  messages,
  tasks,
  artifacts,
  activityLog,
  phaseMetrics,
  generatedFiles,
} from './db/schema.js'
import { eq } from 'drizzle-orm'
import { AGENT_ROLES } from './agents/roles.js'
import { callLLM } from './agents/llm.js'
import { runCodingAgent, isCodingAgentAvailable } from './agents/coding-agent.js'
import { detectStack, getDeploymentOptions, redeployProject, getProjectDir } from './agents/deployment-manager.js'
import type { AgentRole } from './agents/roles.js'

const require = createRequire(import.meta.url)

/** Roles that invoke Claude Code / Opencode for actual code generation */
const CODING_ROLES: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops']

/** Roles that invoke the coding agent during the testing phase */
const TESTING_ROLES: AgentRole[] = ['qa']

// ── Broadcast injection ───────────────────────────────────────────────────────

let _broadcast: (event: unknown) => void = () => {}

/** Called by index.ts to wire in the WebSocket broadcast function before workers start. */
export function setBroadcast(fn: (event: unknown) => void): void {
  _broadcast = fn
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function logActivity(
  projectId: string,
  agentId: string | null,
  agentRole: string | null,
  action: string,
  details: string,
  logType: string,
  phase: string | null,
): void {
  const id = uuid()
  db.insert(activityLog).values({
    id,
    projectId,
    agentId,
    agentRole,
    action,
    details,
    logType: logType as any,
    phase,
    createdAt: new Date(),
  }).run()
  _broadcast({
    type: 'activity:log',
    payload: {
      projectId, id, agentId, agentRole, action, details, logType, phase,
      createdAt: new Date().toISOString(),
    },
  })
}

function getTaskDescription(phase: string, role: string): string {
  const map: Record<string, Record<string, string>> = {
    requirements: {
      pm: 'Creating project plan and sprint structure',
      ba: 'Analyzing requirements and writing user stories',
    },
    architecture: {
      architect: 'Designing system architecture and API contracts',
      pm: 'Reviewing architecture proposal',
    },
    development: {
      pm: 'Coordinating development team',
      frontend_dev: 'Building UI components and pages',
      backend_dev: 'Implementing API endpoints and database',
    },
    testing: {
      qa: 'Running tests and creating test reports',
      frontend_dev: 'Fixing frontend bugs',
      backend_dev: 'Fixing backend bugs',
      pm: 'Reviewing test results',
    },
    deployment: {
      devops: 'Setting up CI/CD and deploying',
      pm: 'Verifying launch checklist',
    },
  }
  return map[phase]?.[role] ?? `Working on ${phase}`
}

// Each subtask has a label (shown in live panel) and a focused prompt.
// Smaller, targeted prompts → faster LLM responses, better quality per section.
function getPhaseSubtasks(phase: string, role: string): Array<{ label: string; prompt: string; maxTokens?: number }> {
  if (phase === 'requirements') {
    if (role === 'pm') return [
      { label: 'Drafting project charter', prompt: 'Write a concise project charter: business objective, success metrics, and key stakeholders. 2-3 paragraphs.', maxTokens: 800 },
      { label: 'High-level timeline', prompt: 'Create a high-level timeline with 4-5 major milestones and their dates relative to project start. Use a markdown list.', maxTokens: 600 },
      { label: 'Planning sprints', prompt: 'Define 3 sprints with clear goals and deliverables per sprint. Use a markdown table.', maxTokens: 800 },
      { label: 'Risk register', prompt: 'Identify 3-5 potential risks for this project and provide mitigations for each. Use a table.', maxTokens: 700 },
    ]
    if (role === 'ba') return [
      { label: 'User personas', prompt: 'Identify 2 primary user personas. For each: goals and pain points. 4-5 bullet points each.', maxTokens: 700 },
      { label: 'Functional stories (Core)', prompt: 'Write 4 critical user stories for the core features in "As a... I want... so that..." format with 2 criteria each.', maxTokens: 800 },
      { label: 'Functional stories (Admin)', prompt: 'Write 4 user stories for administrative or secondary features including auth and settings.', maxTokens: 800 },
      { label: 'Core data model', prompt: 'Define the core data entities and their key fields (5-8 fields each) in a markdown table.', maxTokens: 800 },
    ]
  }
  if (phase === 'architecture') {
    if (role === 'architect') return [
      { label: 'System components', prompt: 'Describe the high-level architecture: frontend, backend, and database choices with brief rationale.', maxTokens: 800 },
      { label: 'Component interfaces', prompt: 'Detail how the major components interact. List 3-4 key internal interfaces or service boundaries.', maxTokens: 700 },
      { label: 'API Blueprint (Part 1)', prompt: 'Define the 3 most important GET endpoints including path, parameters, and response shape.', maxTokens: 900 },
      { label: 'API Blueprint (Part 2)', prompt: 'Define the 3 most important POST/PUT endpoints including path, request body, and auth requirements.', maxTokens: 900 },
      { label: 'Database schema', prompt: 'Provide a detailed database schema: tables, columns, types, and primary/foreign keys. Use markdown.', maxTokens: 900 },
      { label: 'Security strategy', prompt: 'Define the authentication flow, authorization (RBAC), and sensitive data protection measures.', maxTokens: 800 },
    ]
    if (role === 'pm') return [
      { label: 'Architecture review', prompt: 'Review the architecture and list 3 strengths and 2 potential scalability risks.', maxTokens: 600 },
      { label: 'Go/No-go assessment', prompt: 'Provide a final recommendation on whether to proceed to development based on the design.', maxTokens: 400 },
    ]
  }
  if (phase === 'development') {
    if (role === 'pm') return [
      { label: 'Dev coordination', prompt: 'Write a developer coordination note detailing parallel work streams and integration checkpoints.', maxTokens: 400 },
      { label: 'Blocker assessment', prompt: 'Analyze potential technical blockers for this stack and suggest preventative measures.', maxTokens: 500 },
    ]
    if (role === 'frontend_dev') return [
      { label: 'Folder structure & setup', prompt: 'Define the frontend app structure, folder layout, and core configuration files (routing, types).', maxTokens: 800 },
      { label: 'Design system & theme', prompt: 'Define the design tokens (colors, typography) and 5 core reusable UI components.', maxTokens: 800 },
      { label: 'Feature implementation (A)', prompt: 'Write the TypeScript/JSX code for the primary user dashboard or landing page.', maxTokens: 1200 },
      { label: 'Feature implementation (B)', prompt: 'Write the code for the main functional feature (e.g. search, editor, or list view).', maxTokens: 1200 },
    ]
    if (role === 'backend_dev') return [
      { label: 'API Server structure', prompt: 'Define the backend folder structure, middleware chain, and error handling pattern.', maxTokens: 800 },
      { label: 'Database & Auth layer', prompt: 'Implement the database connection logic and the core authentication/authorization middleware.', maxTokens: 900 },
      { label: 'Endpoint group (A)', prompt: 'Implement the two most critical data retrieval (GET) endpoints with validation and DB queries.', maxTokens: 1200 },
      { label: 'Endpoint group (B)', prompt: 'Implement the two most critical mutation (POST/PUT) endpoints with validation and error handling.', maxTokens: 1200 },
    ]
  }
  if (phase === 'testing') {
    if (role === 'qa') return [
      { label: 'Test strategy', prompt: 'Define the overall testing strategy: scope, tooling, and environment requirements.', maxTokens: 700 },
      { label: 'Unit test cases', prompt: 'Write 4-5 unit test scenarios for critical business logic with expected results.', maxTokens: 800 },
      { label: 'Integration test cases', prompt: 'Write 3-4 end-to-end integration scenarios for the core user flows.', maxTokens: 800 },
      { label: 'Security audit cases', prompt: 'List 3 critical security tests focusing on auth bypass and data leak prevention.', maxTokens: 700 },
    ]
    if (role === 'frontend_dev') return [
      { label: 'UI bug fixes', prompt: 'Identify and describe fixes for 3 common UI issues: responsive layout bugs, state race conditions, and error boundaries.', maxTokens: 800 },
    ]
    if (role === 'backend_dev') return [
      { label: 'API bug fixes', prompt: 'Identify and describe fixes for 3 common API issues: edge case validation, DB timeout handling, and slow queries.', maxTokens: 800 },
    ]
    if (role === 'pm') return [
      { label: 'Testing sign-off', prompt: 'Review test results and provide an official sign-off summary with known issues list.', maxTokens: 500 },
    ]
  }
  if (phase === 'deployment') {
    if (role === 'devops') return [
      { label: 'Infrastructure as Code', prompt: 'Write a production-ready Dockerfile and docker-compose.yml with environment variable mapping.', maxTokens: 1000 },
      { label: 'CI/CD Pipeline', prompt: 'Design a GitHub Actions or GitLab CI pipeline for build, test, and container push.', maxTokens: 900 },
      { label: 'Deployment runbook', prompt: 'Write a step-by-step deployment and rollback guide with health check verification.', maxTokens: 800 },
    ]
    if (role === 'pm') return [
      { label: 'Launch checklist', prompt: 'Complete the launch readiness checklist: technical, business, and legal checkmarks.', maxTokens: 600 },
      { label: 'Live monitoring setup', prompt: 'Identify 5 critical health metrics to monitor in production and their alert thresholds.', maxTokens: 600 },
    ]
  }
  // fallback: single generic call
  return [{ label: `Working on ${phase}`, prompt: `Please perform your key ${phase} phase responsibilities for this project. Be specific and concise. Focus on the most impactful deliverables.`, maxTokens: 1000 }]
}

/** Legacy single-string helper used only where we still need a joined prompt (e.g. coding agent plan). */
function getPhasePrompt(phase: string, role: string): string {
  return getPhaseSubtasks(phase, role).map(t => t.prompt).join('\n\n')
}


function getMessageType(phase: string, role: string): string {
  if (role === 'pm') return 'decision'
  if (phase === 'requirements' || phase === 'architecture') return 'discussion'
  if (phase === 'testing') return 'review'
  return 'task_update'
}

function getArtifactType(phase: string, role: string): string | null {
  if (phase === 'requirements' && role === 'ba') return 'spec'
  if (phase === 'requirements' && role === 'pm') return 'documentation'
  if (phase === 'architecture' && role === 'architect') return 'architecture'
  if (phase === 'development' && (role === 'frontend_dev' || role === 'backend_dev')) return 'code'
  if (phase === 'testing' && role === 'qa') return 'test_report'
  if (phase === 'deployment' && role === 'devops') return 'deployment_config'
  return null
}

const TASK_TEMPLATES: Record<string, Record<string, Array<{
  title: string; description: string; priority: string; sprint: number; hours: number
}>>> = {
  requirements: {
    pm: [
      { title: 'Create project plan', description: 'Define sprints, milestones and deliverables', priority: 'high', sprint: 1, hours: 4 },
      { title: 'Define team allocation', description: 'Assign team members to phases', priority: 'high', sprint: 1, hours: 2 },
    ],
    ba: [
      { title: 'Gather requirements', description: 'Document functional and non-functional requirements', priority: 'critical', sprint: 1, hours: 8 },
      { title: 'Create user stories', description: 'Write user stories with acceptance criteria', priority: 'high', sprint: 1, hours: 6 },
      { title: 'Define data model', description: 'Design initial data model', priority: 'high', sprint: 1, hours: 4 },
    ],
  },
  architecture: {
    architect: [
      { title: 'Design system architecture', description: 'Create architecture diagrams and component design', priority: 'critical', sprint: 1, hours: 8 },
      { title: 'Define API contracts', description: 'Design REST API endpoints and schemas', priority: 'high', sprint: 1, hours: 6 },
      { title: 'Design database schema', description: 'Create normalized database schema', priority: 'high', sprint: 1, hours: 4 },
      { title: 'Security architecture', description: 'Define auth, encryption, and security measures', priority: 'high', sprint: 1, hours: 4 },
    ],
    pm: [
      { title: 'Review architecture', description: 'Review and approve architecture decisions', priority: 'high', sprint: 1, hours: 2 },
    ],
  },
  development: {
    frontend_dev: [
      { title: 'Set up frontend project', description: 'Initialize React project with routing and state management', priority: 'high', sprint: 2, hours: 4 },
      { title: 'Build UI components', description: 'Create reusable UI component library', priority: 'high', sprint: 2, hours: 8 },
      { title: 'Implement pages', description: 'Build all application pages', priority: 'high', sprint: 2, hours: 12 },
      { title: 'API integration', description: 'Connect frontend to backend APIs', priority: 'high', sprint: 2, hours: 6 },
    ],
    backend_dev: [
      { title: 'Set up backend project', description: 'Initialize API server with middleware', priority: 'high', sprint: 2, hours: 4 },
      { title: 'Implement database layer', description: 'Create database models and migrations', priority: 'high', sprint: 2, hours: 6 },
      { title: 'Build API endpoints', description: 'Implement all REST endpoints', priority: 'high', sprint: 2, hours: 12 },
      { title: 'Authentication system', description: 'Implement JWT auth flow', priority: 'critical', sprint: 2, hours: 6 },
    ],
    pm: [
      { title: 'Track development progress', description: 'Monitor sprint progress and resolve blockers', priority: 'medium', sprint: 2, hours: 4 },
    ],
  },
  testing: {
    qa: [
      { title: 'Create test plan', description: 'Define test strategy and test cases', priority: 'high', sprint: 3, hours: 4 },
      { title: 'Write unit tests', description: 'Write unit tests for critical functions', priority: 'high', sprint: 3, hours: 8 },
      { title: 'Write integration tests', description: 'Write integration tests for API endpoints', priority: 'high', sprint: 3, hours: 6 },
      { title: 'Security testing', description: 'Perform security audit', priority: 'critical', sprint: 3, hours: 4 },
    ],
    pm: [
      { title: 'Review test results', description: 'Review QA findings and prioritize fixes', priority: 'high', sprint: 3, hours: 2 },
    ],
    frontend_dev: [
      { title: 'Fix frontend bugs', description: 'Address bugs found during QA', priority: 'high', sprint: 3, hours: 4 },
    ],
    backend_dev: [
      { title: 'Fix backend bugs', description: 'Address bugs found during QA', priority: 'high', sprint: 3, hours: 4 },
    ],
  },
  deployment: {
    devops: [
      { title: 'Docker configuration', description: 'Create Dockerfiles and docker-compose', priority: 'high', sprint: 4, hours: 4 },
      { title: 'CI/CD pipeline', description: 'Set up GitHub Actions pipeline', priority: 'high', sprint: 4, hours: 6 },
      { title: 'Deploy to production', description: 'Deploy application to production environment', priority: 'critical', sprint: 4, hours: 4 },
      { title: 'Monitoring setup', description: 'Configure logging and monitoring', priority: 'medium', sprint: 4, hours: 4 },
    ],
    pm: [
      { title: 'Launch checklist', description: 'Verify all launch criteria met', priority: 'critical', sprint: 4, hours: 2 },
    ],
  },
}

async function createTasksAsInProgress(
  projectId: string,
  agentRecord: { id: string; role: string; copyIndex: number },
  phase: string,
  subtaskSlice?: { start: number; end: number; total: number }
): Promise<void> {
  const now = new Date()
  let templates = TASK_TEMPLATES[phase]?.[agentRecord.role] ?? []
  
  // Distribute templates evenly across parallel copies
  if (subtaskSlice && subtaskSlice.total > 1) {
    templates = templates.filter((_, i) => i % subtaskSlice.total === subtaskSlice.start)
    if (templates.length === 0) {
      // Fallback: if there are fewer templates than agents, just give them a generic placeholder template
      templates = [{ title: `Assist with ${phase}`, description: `Support the ${agentRecord.role} tasks in ${phase}`, priority: 'medium', sprint: 1, hours: 2 }]
    }
  }

  // Check which tasks already exist for this agent+phase so we don't double-insert
  const existing = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all()
  const existingTitles = new Set(existing.filter(t => t.phase === phase && t.assigneeId === agentRecord.id).map(t => t.title))
  for (const template of templates) {
    if (existingTitles.has(template.title)) continue
    const taskId = uuid()
    db.insert(tasks).values({
      id: taskId,
      projectId,
      assigneeId: agentRecord.id,
      title: template.title,
      description: template.description,
      status: 'in_progress',
      priority: template.priority as any,
      sprint: template.sprint,
      phase,
      estimatedHours: template.hours,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }).run()
    _broadcast({
      type: 'task:created',
      payload: { projectId, taskId, title: template.title, status: 'in_progress', assigneeId: agentRecord.id, phase, description: template.description, priority: template.priority, sprint: template.sprint, estimatedHours: template.hours },
    })
  }
}

async function markTasksDone(projectId: string, agentRecord: { id: string; role: string; copyIndex: number }, phase: string): Promise<void> {
  const now = new Date()
  const agentTasks = db.select().from(tasks)
    .where(eq(tasks.projectId, projectId))
    .all()
    .filter(t => t.assigneeId === agentRecord.id && t.phase === phase && t.status === 'in_progress')
  for (const task of agentTasks) {
    db.update(tasks)
      .set({ status: 'done', completedAt: now, updatedAt: now })
      .where(eq(tasks.id, task.id))
      .run()
    _broadcast({
      type: 'task:updated',
      payload: { projectId, taskId: task.id, status: 'done', completedAt: now.toISOString() },
    })
  }
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function setupPhase(input: { projectId: string; phase: string }): Promise<{ conversationId: string; metricsId: string }> {
  const { projectId, phase } = input

  db.update(projects)
    .set({ currentPhase: phase as any, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .run()

  _broadcast({ type: 'phase:started', payload: { projectId, phase } })
  logActivity(projectId, null, null, `Phase started: ${phase}`, `Entering ${phase} phase`, 'milestone', phase)

  // Create phase metrics record
  const metricsId = uuid()
  db.insert(phaseMetrics).values({
    id: metricsId,
    projectId,
    phase,
    startedAt: new Date(),
    status: 'in_progress',
  }).run()

  const conversationId = uuid()
  const title = `${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase Discussion`
  db.insert(conversations).values({
    id: conversationId,
    projectId,
    title,
    phase,
    status: 'active',
    createdAt: new Date(),
  }).run()

  _broadcast({ type: 'conversation:created', payload: { projectId, conversationId, title, phase } })
  return { conversationId, metricsId }
}

export async function runAgentWork(input: {
  projectId: string
  phase: string
  role: string
  conversationId: string
  metricsId?: string
  agentId?: string           // explicit agent ID (for multi-copy parallelism)
  subtaskSlice?: { start: number; end: number; total: number } // which subtasks to handle
}): Promise<void> {
  const { projectId, phase, role, conversationId, metricsId, subtaskSlice } = input
  const agentStartTime = Date.now()

  const roleConfig = AGENT_ROLES[role as AgentRole]
  if (!roleConfig) throw new Error(`Unknown agent role: ${role}`)

  // Find the agent: use explicit agentId if provided, otherwise first match by role
  const allRoleAgents = db.select().from(agents)
    .where(eq(agents.projectId, projectId))
    .all()
    .filter(a => a.role === role)
  const agentRecord = input.agentId
    ? allRoleAgents.find(a => a.id === input.agentId)
    : allRoleAgents[0]
  if (!agentRecord) throw new Error(`Agent ${role}${input.agentId ? `(${input.agentId})` : ''} not found for project ${projectId}`)

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
  if (!project) throw new Error(`Project ${projectId} not found`)

  // thinking
  db.update(agents)
    .set({ status: 'thinking', currentTask: `Analyzing ${phase} requirements`, progress: 0 })
    .where(eq(agents.id, agentRecord.id))
    .run()
  _broadcast({ type: 'agent:status', payload: { projectId, agentId: agentRecord.id, role, status: 'thinking', task: `Analyzing ${phase} requirements` } })

  // Build context from DB
  const previousMessages = db.select().from(messages).where(eq(messages.projectId, projectId)).all()
  const existingArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all()

  const contextParts = [
    `Project: ${project.name}`,
    `Description: ${project.description}`,
    `Current Phase: ${phase}`,
    `Your Role: ${roleConfig.name}`,
  ]
  if (project.config && project.config !== '{}') {
    try {
      const config = JSON.parse(project.config)
      if (config.stack?.length) contextParts.push(`Tech Stack: ${config.stack.join(', ')}`)
      if (config.features?.length) contextParts.push(`Features: ${config.features.join(', ')}`)
    } catch { /* ignore bad JSON */ }
  }
  if (existingArtifacts.length > 0) {
    contextParts.push('\n--- Previous Artifacts ---')
    for (const artifact of existingArtifacts.slice(-5)) {
      contextParts.push(`[${artifact.type}] ${artifact.title}:\n${artifact.content.substring(0, 1500)}`)
    }
  }
  if (previousMessages.length > 0) {
    contextParts.push('\n--- Recent Team Discussions ---')
    for (const msg of previousMessages.slice(-10)) {
      contextParts.push(`[${msg.agentRole}]: ${msg.content.substring(0, 300)}`)
    }
  }

  // Inject steering directive if set
  if (project.config && project.config !== '{}') {
    try {
      const config = JSON.parse(project.config)
      if (config.steeringDirective) {
        contextParts.push(`\n--- [PM DIRECTIVE - HIGH PRIORITY] ---\n${config.steeringDirective}\n--- Acknowledge this directive and prioritize it in your output. ---`)
        logActivity(projectId, agentRecord.id, role, 'Applying PM directive', `Directive injected into ${role} context`, 'info', phase)
      }
    } catch { /* ignore */ }
  }

  const context = contextParts.join('\n')
  const allSubtasks = getPhaseSubtasks(phase, role)

  // Determine which subtasks this agent copy handles
  let mySubtasks = allSubtasks
  if (subtaskSlice && subtaskSlice.total > 1) {
    mySubtasks = allSubtasks.filter((_, i) => i % subtaskSlice.total === subtaskSlice.start)
    if (mySubtasks.length === 0) mySubtasks = [allSubtasks[subtaskSlice.start % allSubtasks.length]]
  }

  const taskDesc = mySubtasks[0]?.label ?? getTaskDescription(phase, role)

  // working — emit tasks as in_progress immediately so sprint board shows live state
  await createTasksAsInProgress(projectId, agentRecord as any, phase, subtaskSlice)

  db.update(agents)
    .set({ status: 'working', progress: 20, currentTask: taskDesc })
    .where(eq(agents.id, agentRecord.id))
    .run()
  _broadcast({ type: 'agent:status', payload: { projectId, agentId: agentRecord.id, role, status: 'working', task: taskDesc } })
  _broadcast({ type: 'agent:progress', payload: { projectId, agentId: agentRecord.id, role, progress: 20, status: 'working' } })

  let responseContent: string
  let usedCodingAgent = false

  const shouldUseCodingAgent =
    (CODING_ROLES.includes(role as AgentRole) && phase === 'development') ||
    (TESTING_ROLES.includes(role as AgentRole) && phase === 'testing')

  if (shouldUseCodingAgent) {
    const codingAgent = isCodingAgentAvailable()
    if (codingAgent.available) {
      logActivity(projectId, agentRecord.id, role, `Using ${codingAgent.name}`, `${roleConfig.name} is using ${codingAgent.name} to write code`, 'info', phase)

      const planResponse = await callLLM(roleConfig.systemPrompt, [
        { role: 'user', content: `${context}\n\n${getPhasePrompt(phase, role)}\n\nProvide a detailed implementation plan with specific files to create and their contents. Be very specific about the code structure.` },
      ], { maxTokens: 2000 })

      db.update(agents).set({ progress: 40, currentTask: `Writing code with ${codingAgent.name}` }).where(eq(agents.id, agentRecord.id)).run()
      _broadcast({ type: 'agent:progress', payload: { projectId, agentId: agentRecord.id, role, progress: 40, status: 'working' } })

      const codingResult = await runCodingAgent({
        projectId,
        projectName: project.name,
        task: `${getPhasePrompt(phase, role)}\n\nHere is the implementation plan from the team:\n${planResponse.content}`,
        context,
      })

      usedCodingAgent = true
      if (codingResult.success) {
        responseContent = `## Implementation Complete\n\n${planResponse.content}\n\n### Coding Agent Output\n${codingResult.output}\n\n### Files Created\n${codingResult.filesCreated.map(f => `- ${f}`).join('\n') || 'None'}\n\n### Duration\n${Math.round(codingResult.duration / 1000)}s`
      } else {
        responseContent = `## Implementation (Fallback Mode)\n\n${planResponse.content}\n\n*Note: ${codingResult.error ?? 'Coding agent encountered an issue, using plan output instead.'}*`
      }
    } else {
      // No coding agent: run micro-tasks sequentially
      const sections: string[] = []
      for (let i = 0; i < mySubtasks.length; i++) {
        const subtask = mySubtasks[i]
        const progressPct = 20 + Math.round(((i + 1) / mySubtasks.length) * 55)
        db.update(agents).set({ progress: progressPct, currentTask: subtask.label }).where(eq(agents.id, agentRecord.id)).run()
        _broadcast({ type: 'agent:status', payload: { projectId, agentId: agentRecord.id, role, status: 'working', task: subtask.label } })
        _broadcast({ type: 'agent:progress', payload: { projectId, agentId: agentRecord.id, role, progress: progressPct, status: 'working' } })
        const resp = await callLLM(roleConfig.systemPrompt, [{ role: 'user', content: `${context}\n\n${subtask.prompt}` }], { maxTokens: subtask.maxTokens ?? 1000 })
        sections.push(`## ${subtask.label}\n\n${resp.content}`)
      }
      responseContent = sections.join('\n\n---\n\n')
    }
  } else {
    // Non-coding path: run assigned subtasks sequentially with live progress
    const sections: string[] = []
    for (let i = 0; i < mySubtasks.length; i++) {
      const subtask = mySubtasks[i]
      const progressPct = 20 + Math.round(((i + 1) / mySubtasks.length) * 55)
      db.update(agents).set({ progress: progressPct, currentTask: subtask.label }).where(eq(agents.id, agentRecord.id)).run()
      _broadcast({ type: 'agent:status', payload: { projectId, agentId: agentRecord.id, role, status: 'working', task: subtask.label } })
      _broadcast({ type: 'agent:progress', payload: { projectId, agentId: agentRecord.id, role, progress: progressPct, status: 'working' } })
      const resp = await callLLM(roleConfig.systemPrompt, [{ role: 'user', content: `${context}\n\n${subtask.prompt}` }], { maxTokens: subtask.maxTokens ?? 1000 })
      sections.push(`## ${subtask.label}\n\n${resp.content}`)
    }
    responseContent = sections.join('\n\n---\n\n')
  }

  // progress-100 is done via markTasksDone → agent:done below

  // Save message
  const messageId = uuid()
  const messageType = getMessageType(phase, role)
  db.insert(messages).values({
    id: messageId,
    conversationId,
    projectId,
    agentId: agentRecord.id,
    agentRole: role,
    content: responseContent,
    messageType: messageType as any,
    createdAt: new Date(),
  }).run()
  _broadcast({
    type: 'message:created',
    payload: {
      projectId,
      conversationId,
      message: { id: messageId, agentId: agentRecord.id, agentRole: role, content: responseContent, messageType, createdAt: new Date().toISOString() },
    },
  })

  // Save artifact
  const artifactType = getArtifactType(phase, role)
  if (artifactType) {
    const artifactId = uuid()
    db.insert(artifacts).values({
      id: artifactId,
      projectId,
      agentId: agentRecord.id,
      title: `${roleConfig.name} - ${phase} Output`,
      type: artifactType as any,
      content: responseContent,
      phase,
      createdAt: new Date(),
    }).run()
    _broadcast({
      type: 'artifact:created',
      payload: { projectId, artifactId, title: `${roleConfig.name} - ${phase} Output`, type: artifactType, agentId: agentRecord.id, agentRole: role, phase },
    })
  }

  await markTasksDone(projectId, agentRecord as any, phase)

  db.update(agents).set({ status: 'done', progress: 100, currentTask: null }).where(eq(agents.id, agentRecord.id)).run()
  _broadcast({ type: 'agent:status', payload: { projectId, agentId: agentRecord.id, role, status: 'done', progress: 100 } })

  // Track agent duration in phase metrics
  const agentDurationMs = Date.now() - agentStartTime
  if (metricsId) {
    const metric = db.select().from(phaseMetrics).where(eq(phaseMetrics.id, metricsId)).get()
    if (metric) {
      const durations = JSON.parse(metric.agentDurations || '{}')
      durations[role] = {
        startedAt: new Date(agentStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: agentDurationMs,
      }
      db.update(phaseMetrics)
        .set({
          agentDurations: JSON.stringify(durations),
          taskCount: metric.taskCount + (TASK_TEMPLATES[phase]?.[role]?.length ?? 0),
          artifactCount: metric.artifactCount + (artifactType ? 1 : 0),
          messageCount: metric.messageCount + 1,
        })
        .where(eq(phaseMetrics.id, metricsId))
        .run()
    }
  }

  const toolInfo = usedCodingAgent ? ' (using coding agent)' : ''
  logActivity(projectId, agentRecord.id, role, `${roleConfig.name} completed work${toolInfo}`, `Finished ${phase} phase tasks in ${Math.round(agentDurationMs / 1000)}s`, 'success', phase)

  // Small delay for visual pacing
  await new Promise(resolve => setTimeout(resolve, 300))
}

export async function runCollaborationRound(input: {
  projectId: string
  phase: string
  conversationId: string
  metricsId?: string
}): Promise<void> {
  const { projectId, phase, conversationId } = input

  const phaseMessages = db.select().from(messages).where(eq(messages.conversationId, conversationId)).all()
  if (phaseMessages.length === 0) return

  const pmAgent = db.select().from(agents).where(eq(agents.projectId, projectId)).all().find(a => a.role === 'pm')
  if (!pmAgent) return

  const contributions = phaseMessages.map(msg => {
    const roleConfig = AGENT_ROLES[msg.agentRole as AgentRole]
    return `**${roleConfig?.name ?? msg.agentRole}**: ${msg.content.substring(0, 500)}`
  }).join('\n\n')

  const reviewPrompt = `Review the team's work for the ${phase} phase. Here are the contributions:\n\n${contributions}\n\nProvide a brief review summary: what looks good, any concerns, and whether the team can proceed to the next phase. Be constructive and specific.`

  db.update(agents).set({ status: 'reviewing', currentTask: `Reviewing ${phase} phase work` }).where(eq(agents.id, pmAgent.id)).run()
  _broadcast({ type: 'agent:status', payload: { projectId, agentId: pmAgent.id, role: 'pm', status: 'reviewing', task: `Reviewing ${phase} phase work` } })

  const response = await callLLM(AGENT_ROLES.pm.systemPrompt, [{ role: 'user', content: reviewPrompt }])

  const messageId = uuid()
  db.insert(messages).values({
    id: messageId,
    conversationId,
    projectId,
    agentId: pmAgent.id,
    agentRole: 'pm',
    content: response.content,
    messageType: 'review',
    createdAt: new Date(),
  }).run()
  _broadcast({
    type: 'message:created',
    payload: {
      projectId,
      conversationId,
      message: { id: messageId, agentId: pmAgent.id, agentRole: 'pm', content: response.content, messageType: 'review', createdAt: new Date().toISOString() },
    },
  })

  db.update(agents).set({ status: 'idle', currentTask: null }).where(eq(agents.id, pmAgent.id)).run()
  _broadcast({ type: 'agent:status', payload: { projectId, agentId: pmAgent.id, role: 'pm', status: 'idle' } })
  logActivity(projectId, pmAgent.id, 'pm', 'PM reviewed phase', `Completed review of ${phase} phase`, 'info', phase)
}

export async function completePhase(input: {
  projectId: string
  phase: string
  conversationId: string
  metricsId?: string
}): Promise<void> {
  const { projectId, phase, conversationId, metricsId } = input
  db.update(conversations).set({ status: 'resolved' }).where(eq(conversations.id, conversationId)).run()

  // Finalize phase metrics
  if (metricsId) {
    const metric = db.select().from(phaseMetrics).where(eq(phaseMetrics.id, metricsId)).get()
    const durationMs = metric ? Date.now() - new Date(metric.startedAt).getTime() : 0
    db.update(phaseMetrics)
      .set({ completedAt: new Date(), status: 'completed' })
      .where(eq(phaseMetrics.id, metricsId))
      .run()
    logActivity(projectId, null, null, `Phase completed: ${phase}`, `${phase} phase finished in ${Math.round(durationMs / 1000)}s`, 'success', phase)
  } else {
    logActivity(projectId, null, null, `Phase completed: ${phase}`, `${phase} phase finished successfully`, 'success', phase)
  }

  _broadcast({ type: 'phase:completed', payload: { projectId, phase } })
}

export async function completeProject(input: { projectId: string }): Promise<void> {
  const { projectId } = input
  db.update(projects)
    .set({ status: 'completed', currentPhase: 'completed', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .run()
  _broadcast({ type: 'project:completed', payload: { projectId } })
  logActivity(projectId, null, null, 'Project completed', 'All phases finished successfully', 'milestone', 'completed')
}

export async function failProject(input: { projectId: string; error: string }): Promise<void> {
  const { projectId, error } = input
  db.update(projects)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .run()
  _broadcast({ type: 'project:failed', payload: { projectId, error } })
  logActivity(projectId, null, null, 'Project failed', error, 'error', null)
}

/**
 * Prepares deployment options after the deployment phase completes.
 * Detects the stack, generates Docker files, and broadcasts available options to the user.
 */
export async function prepareDeployment(input: { projectId: string }): Promise<{
  options: Array<{ strategy: string; label: string; description: string; recommended: boolean; requirements: string[]; estimatedTime: string }>
  stackDetected: Record<string, unknown>
}> {
  const { projectId } = input

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
  if (!project) throw new Error(`Project ${projectId} not found`)

  const projectDir = getProjectDir(project.name)
  const stack = detectStack(projectDir)
  const options = getDeploymentOptions(projectDir)

  logActivity(projectId, null, 'devops', 'Deployment options ready',
    `Detected stack: ${stack.framework || 'unknown'} (${stack.language || 'unknown'}). ${options.length} deployment strategies available: ${options.map(o => o.label).join(', ')}`,
    'milestone', 'deployment')

  // Broadcast deployment options to the frontend
  _broadcast({
    type: 'deployment:options',
    payload: { projectId, options },
  })

  return { options, stackDetected: stack as Record<string, unknown> }
}

/**
 * Executes the chosen deployment strategy.
 * Called when the user selects a deployment option from the UI.
 */
export async function executeDeployment(input: {
  projectId: string
  strategy: 'docker' | 'vercel' | 'static'
}): Promise<{ success: boolean; url: string; deploymentId: string; error?: string }> {
  const { projectId, strategy } = input

  logActivity(projectId, null, 'devops', `Starting ${strategy} deployment`,
    `Deploying project using ${strategy} strategy`, 'info', 'deployment')

  try {
    const result = await redeployProject(projectId, strategy, _broadcast)

    if (result.success) {
      logActivity(projectId, null, 'devops', 'Deployment successful',
        `Project deployed successfully. URL: ${result.url}`, 'success', 'deployment')
    } else {
      logActivity(projectId, null, 'devops', 'Deployment failed',
        `Deployment failed: ${result.error}`, 'error', 'deployment')
    }
    return result
  } catch (err) {
    logActivity(projectId, null, null, 'Deployment failed', String(err), 'error', 'deployment')
    return { success: false, url: '', deploymentId: '', error: String(err) }
  }
}

/** Returns the map of all provisioned agents for the project, grouped by role. Used to drive the parallel arrays in the workflow. */
export async function getAgentPool(input: { projectId: string; phase: string }): Promise<any> {
  const projectAgents = db.select().from(agents).where(eq(agents.projectId, input.projectId)).all()
  
  const pool = {
    pm: [] as any[], ba: [] as any[], architect: [] as any[],
    frontend_dev: [] as any[], backend_dev: [] as any[], qa: [] as any[], devops: [] as any[]
  }
  
  for (const a of projectAgents) {
    const k = a.role as keyof typeof pool
    if (pool[k]) pool[k].push({ id: a.id, copyIndex: a.copyIndex })
  }
  
  return pool
}

// ── Worker startup ────────────────────────────────────────────────────────────

export async function startWorker(): Promise<void> {
  const worker = await Worker.create({
    workflowsPath: require.resolve('@saas-factory/temporal-workflows'),
    activities: {
      setupPhase,
      runAgentWork,
      runCollaborationRound,
      completePhase,
      completeProject,
      failProject,
      prepareDeployment,
      executeDeployment,
    },
    namespace: 'default',
    taskQueue: 'factory-builds',
    maxConcurrentActivityTaskExecutions: 10,
  })

  console.log('[Worker] Temporal worker started on task queue: factory-builds')
  // Run in background — crashes are fatal since Temporal handles retries at the activity level
  worker.run().catch(err => {
    console.error('[Worker] Temporal worker crashed:', err)
    process.exit(1)
  })
}
