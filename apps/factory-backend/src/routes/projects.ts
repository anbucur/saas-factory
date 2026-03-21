import { Hono } from 'hono'
import { z } from 'zod'
import { Client } from '@temporalio/client'
import { v4 as uuid } from 'uuid'
import { db } from '../db/index.js'
import { projects, agents, conversations, messages, tasks, artifacts, activityLog } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { AGENT_ROLES } from '../agents/roles.js'
import { isCodingAgentAvailable } from '../agents/coding-agent.js'
import type { AgentRole } from '../agents/roles.js'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  config: z.object({
    stack: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    billingMode: z.enum(['subscription', 'usage', 'none']).optional(),
  }).optional(),
})

export function createProjectRoutes(broadcast: (event: unknown) => void, temporalClient: Client) {
  const app = new Hono()

  // List all projects
  app.get('/', (c) => {
    const allProjects = db.select().from(projects).all()
    const enriched = allProjects.map(p => {
      const projectAgents = db.select().from(agents).where(eq(agents.projectId, p.id)).all()
      const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, p.id)).all()
      const doneTasks = projectTasks.filter(t => t.status === 'done').length
      return {
        ...p,
        config: JSON.parse(p.config || '{}'),
        agentCount: projectAgents.length,
        taskCount: projectTasks.length,
        completedTaskCount: doneTasks,
        progress: projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0,
      }
    })
    return c.json(enriched)
  })

  // Get project detail
  app.get('/:id', (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all()
    const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all()
    const projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all()
    const projectConversations = db.select().from(conversations).where(eq(conversations.projectId, projectId)).all()
    const projectLogs = db.select().from(activityLog).where(eq(activityLog.projectId, projectId)).all()

    return c.json({
      ...project,
      config: JSON.parse(project.config || '{}'),
      agents: projectAgents,
      tasks: projectTasks,
      artifacts: projectArtifacts,
      conversations: projectConversations,
      logs: projectLogs,
    })
  })

  // Create project
  app.post('/', async (c) => {
    const body = await c.req.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const { name, description, config = {} } = parsed.data
    const projectId = uuid()
    const now = new Date()

    db.insert(projects).values({
      id: projectId,
      name,
      description,
      status: 'planning',
      currentPhase: 'requirements',
      config: JSON.stringify(config),
      createdAt: now,
      updatedAt: now,
    }).run()

    for (const [role, roleConfig] of Object.entries(AGENT_ROLES)) {
      db.insert(agents).values({
        id: uuid(),
        projectId,
        role: role as AgentRole,
        name: roleConfig.name,
        status: 'idle',
        progress: 0,
        createdAt: now,
      }).run()
    }

    const codingAgent = isCodingAgentAvailable()
    const codingInfo = codingAgent.available ? `Coding agent: ${codingAgent.name}` : 'Coding agent: fallback mode'
    db.insert(activityLog).values({
      id: uuid(),
      projectId,
      agentId: null,
      agentRole: null,
      action: 'Project created',
      details: `Project "${name}" initialized with ${Object.keys(AGENT_ROLES).length} agents. ${codingInfo}`,
      logType: 'milestone',
      phase: 'requirements',
      createdAt: now,
    }).run()

    broadcast({ type: 'project:created', payload: { projectId, name, description } })

    return c.json({ id: projectId, status: 'created' }, 201)
  })

  // Start project — triggers the Temporal workflow
  app.post('/:id/start', async (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (project.status === 'in_progress') return c.json({ error: 'Project is already running' }, 409)

    db.update(projects)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run()

    broadcast({ type: 'project:started', payload: { projectId } })

    // Start or resume the Temporal workflow — use projectId as workflowId for idempotency
    await temporalClient.workflow.start('buildSaaSProject', {
      workflowId: projectId,
      taskQueue: 'factory-builds',
      args: [{ projectId }],
    })

    return c.json({ status: 'started' })
  })

  // Pause project — sends a signal to the running workflow
  app.post('/:id/pause', async (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (project.status !== 'in_progress') return c.json({ error: 'Project is not running' }, 409)

    db.update(projects)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run()

    const handle = temporalClient.workflow.getHandle(projectId)
    await handle.signal('pause')

    broadcast({ type: 'project:paused', payload: { projectId } })
    db.insert(activityLog).values({
      id: uuid(),
      projectId,
      agentId: null,
      agentRole: null,
      action: 'Project paused',
      details: 'Project execution paused by user',
      logType: 'info',
      phase: null,
      createdAt: new Date(),
    }).run()

    return c.json({ status: 'paused' })
  })

  // Resume project — sends a signal to the paused workflow
  app.post('/:id/resume', async (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (project.status !== 'paused') return c.json({ error: 'Project is not paused' }, 409)

    db.update(projects)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run()

    const handle = temporalClient.workflow.getHandle(projectId)
    await handle.signal('resume')

    broadcast({ type: 'project:resumed', payload: { projectId } })
    return c.json({ status: 'resumed' })
  })

  // Get project agents
  app.get('/:id/agents', (c) => {
    const projectId = c.req.param('id')
    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all()
    return c.json(projectAgents)
  })

  // Get project conversations
  app.get('/:id/conversations', (c) => {
    const projectId = c.req.param('id')
    const convos = db.select().from(conversations).where(eq(conversations.projectId, projectId)).all()
    return c.json(convos)
  })

  // Get conversation messages
  app.get('/:id/conversations/:convId/messages', (c) => {
    const convId = c.req.param('convId')
    const msgs = db.select().from(messages).where(eq(messages.conversationId, convId)).all()
    return c.json(msgs)
  })

  // Get project tasks
  app.get('/:id/tasks', (c) => {
    const projectId = c.req.param('id')
    const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all()
    return c.json(projectTasks)
  })

  // Update task status
  app.patch('/:id/tasks/:taskId', async (c) => {
    const taskId = c.req.param('taskId')
    const body = await c.req.json()
    const { status, assigneeId } = body

    const updates: any = { updatedAt: new Date() }
    if (status) updates.status = status
    if (assigneeId) updates.assigneeId = assigneeId
    if (status === 'done') updates.completedAt = new Date()

    db.update(tasks).set(updates).where(eq(tasks.id, taskId)).run()
    return c.json({ status: 'updated' })
  })

  // Get project artifacts
  app.get('/:id/artifacts', (c) => {
    const projectId = c.req.param('id')
    const projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all()
    return c.json(projectArtifacts)
  })

  // Get project activity log
  app.get('/:id/logs', (c) => {
    const projectId = c.req.param('id')
    const logs = db.select().from(activityLog).where(eq(activityLog.projectId, projectId)).all()
    return c.json(logs)
  })

  // Coding agent status
  app.get('/:id/coding-agent', (_c) => {
    return _c.json(isCodingAgentAvailable())
  })

  // Delete project
  app.delete('/:id', async (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (project.status === 'in_progress') return c.json({ error: 'Cannot delete a running project' }, 409)

    // Try to terminate the Temporal workflow if it exists
    try {
      const handle = temporalClient.workflow.getHandle(projectId)
      await handle.terminate('Project deleted')
    } catch { /* workflow may not exist */ }

    db.delete(activityLog).where(eq(activityLog.projectId, projectId)).run()
    db.delete(artifacts).where(eq(artifacts.projectId, projectId)).run()
    db.delete(tasks).where(eq(tasks.projectId, projectId)).run()
    db.delete(messages).where(eq(messages.projectId, projectId)).run()
    db.delete(conversations).where(eq(conversations.projectId, projectId)).run()
    db.delete(agents).where(eq(agents.projectId, projectId)).run()
    db.delete(projects).where(eq(projects.id, projectId)).run()

    return c.json({ status: 'deleted' })
  })

  return app
}
