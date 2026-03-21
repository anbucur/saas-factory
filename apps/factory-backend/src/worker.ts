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
} from './db/schema.js'
import { eq } from 'drizzle-orm'
import { AGENT_ROLES } from './agents/roles.js'
import { callLLM } from './agents/llm.js'
import { runCodingAgent, isCodingAgentAvailable } from './agents/coding-agent.js'
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

function getPhasePrompt(phase: string, role: string): string {
  const base = `Please perform your ${phase} phase responsibilities for this project.`
  if (phase === 'requirements') {
    if (role === 'pm') return `${base} Create a project plan with sprints, milestones, and team assignments. Include risk assessment and timeline estimates.`
    if (role === 'ba') return `${base} Analyze the project description and create detailed requirements, user stories with acceptance criteria, and identify edge cases. Include data model suggestions.`
  }
  if (phase === 'architecture') {
    if (role === 'pm') return `${base} Review the architecture proposal and provide feedback on feasibility, timeline impact, and resource requirements.`
    if (role === 'architect') return `${base} Design the system architecture, choose the technology stack with rationale, define API contracts with request/response schemas, and create the database schema. Include component diagrams.`
  }
  if (phase === 'development') {
    if (role === 'pm') return `${base} Track development progress, identify any blockers, and coordinate between frontend and backend developers.`
    if (role === 'frontend_dev') return `${base} Implement the frontend: set up the project structure, create reusable UI components, implement all pages with routing, add state management, and connect to backend APIs. Write actual working code.`
    if (role === 'backend_dev') return `${base} Implement the backend: set up the server framework, create database models and migrations, implement all API endpoints with validation, add authentication middleware, and error handling. Write actual working code.`
  }
  if (phase === 'testing') {
    if (role === 'pm') return `${base} Review test results, prioritize bug fixes, and determine readiness for deployment.`
    if (role === 'qa') return `${base} Create comprehensive test plans, write automated tests (unit, integration, e2e), perform security audit, and report all issues found with severity levels and reproduction steps.`
    if (role === 'frontend_dev') return `${base} Review and fix any frontend bugs found during testing. Add missing error handling and edge case coverage.`
    if (role === 'backend_dev') return `${base} Review and fix any backend bugs found during testing. Add missing validation and error handling.`
  }
  if (phase === 'deployment') {
    if (role === 'pm') return `${base} Coordinate the deployment process, verify the launch checklist, and confirm all quality gates have been passed.`
    if (role === 'devops') return `${base} Set up the deployment pipeline with Docker, create CI/CD configuration (GitHub Actions), configure monitoring and logging, and deploy to production. Include rollback procedures.`
  }
  return base
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

async function createTasksFromWork(projectId: string, agentRecord: { id: string; role: string }, phase: string): Promise<void> {
  const now = new Date()
  const templates = TASK_TEMPLATES[phase]?.[agentRecord.role] ?? []
  for (const template of templates) {
    const taskId = uuid()
    db.insert(tasks).values({
      id: taskId,
      projectId,
      assigneeId: agentRecord.id,
      title: template.title,
      description: template.description,
      status: 'done',
      priority: template.priority as any,
      sprint: template.sprint,
      phase,
      estimatedHours: template.hours,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    }).run()
    _broadcast({
      type: 'task:created',
      payload: { projectId, taskId, title: template.title, status: 'done', assigneeId: agentRecord.id, phase },
    })
  }
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function setupPhase(input: { projectId: string; phase: string }): Promise<{ conversationId: string }> {
  const { projectId, phase } = input

  db.update(projects)
    .set({ currentPhase: phase as any, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .run()

  _broadcast({ type: 'phase:started', payload: { projectId, phase } })
  logActivity(projectId, null, null, `Phase started: ${phase}`, `Entering ${phase} phase`, 'milestone', phase)

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
  return { conversationId }
}

export async function runAgentWork(input: {
  projectId: string
  phase: string
  role: string
  conversationId: string
}): Promise<void> {
  const { projectId, phase, role, conversationId } = input

  const roleConfig = AGENT_ROLES[role as AgentRole]
  if (!roleConfig) throw new Error(`Unknown agent role: ${role}`)

  const agentRecord = db.select().from(agents)
    .where(eq(agents.projectId, projectId))
    .all()
    .find(a => a.role === role)
  if (!agentRecord) throw new Error(`Agent ${role} not found for project ${projectId}`)

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

  const context = contextParts.join('\n')
  const prompt = getPhasePrompt(phase, role)
  const taskDesc = getTaskDescription(phase, role)

  // working
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
        { role: 'user', content: `${context}\n\n${prompt}\n\nProvide a detailed implementation plan with specific files to create and their contents. Be very specific about the code structure.` },
      ])

      db.update(agents).set({ progress: 40, currentTask: `Writing code with ${codingAgent.name}` }).where(eq(agents.id, agentRecord.id)).run()
      _broadcast({ type: 'agent:progress', payload: { projectId, agentId: agentRecord.id, role, progress: 40, status: 'working' } })

      const codingResult = await runCodingAgent({
        projectId,
        projectName: project.name,
        task: `${prompt}\n\nHere is the implementation plan from the team:\n${planResponse.content}`,
        context,
      })

      usedCodingAgent = true
      if (codingResult.success) {
        responseContent = `## Implementation Complete\n\n${planResponse.content}\n\n### Coding Agent Output\n${codingResult.output}\n\n### Files Created\n${codingResult.filesCreated.map(f => `- ${f}`).join('\n') || 'None'}\n\n### Duration\n${Math.round(codingResult.duration / 1000)}s`
      } else {
        responseContent = `## Implementation (Fallback Mode)\n\n${planResponse.content}\n\n*Note: ${codingResult.error ?? 'Coding agent encountered an issue, using plan output instead.'}*`
      }
    } else {
      const response = await callLLM(roleConfig.systemPrompt, [{ role: 'user', content: `${context}\n\n${prompt}` }])
      responseContent = response.content
    }
  } else {
    const response = await callLLM(roleConfig.systemPrompt, [{ role: 'user', content: `${context}\n\n${prompt}` }])
    responseContent = response.content
  }

  db.update(agents).set({ progress: 75 }).where(eq(agents.id, agentRecord.id)).run()
  _broadcast({ type: 'agent:progress', payload: { projectId, agentId: agentRecord.id, role, progress: 75, status: 'working' } })

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

  await createTasksFromWork(projectId, agentRecord, phase)

  db.update(agents).set({ status: 'done', progress: 100, currentTask: null }).where(eq(agents.id, agentRecord.id)).run()
  _broadcast({ type: 'agent:status', payload: { projectId, agentId: agentRecord.id, role, status: 'done', progress: 100 } })

  const toolInfo = usedCodingAgent ? ' (using coding agent)' : ''
  logActivity(projectId, agentRecord.id, role, `${roleConfig.name} completed work${toolInfo}`, `Finished ${phase} phase tasks`, 'success', phase)

  // Small delay for visual pacing
  await new Promise(resolve => setTimeout(resolve, 300))
}

export async function runCollaborationRound(input: {
  projectId: string
  phase: string
  conversationId: string
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
}): Promise<void> {
  const { projectId, phase, conversationId } = input
  db.update(conversations).set({ status: 'resolved' }).where(eq(conversations.id, conversationId)).run()
  _broadcast({ type: 'phase:completed', payload: { projectId, phase } })
  logActivity(projectId, null, null, `Phase completed: ${phase}`, `${phase} phase finished successfully`, 'success', phase)
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
