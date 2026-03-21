import { Hono } from 'hono'
import { z } from 'zod'
import { Client } from '@temporalio/client'
import { v4 as uuid } from 'uuid'
import { db } from '../db/index.js'
import { projects, agents, conversations, messages, tasks, artifacts, activityLog, phaseMetrics, generatedFiles, deployments } from '../db/schema.js'
import { eq, desc, and, sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { AGENT_ROLES } from '../agents/roles.js'
import { isCodingAgentAvailable } from '../agents/coding-agent.js'
import { detectStack, getDeploymentOptions, redeployProject, stopDeployment, removeObsoleteDeployments, checkDeploymentHealth, getProjectDir } from '../agents/deployment-manager.js'
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
    const projectMetrics = db.select().from(phaseMetrics).where(eq(phaseMetrics.projectId, projectId)).all()
    const projectFiles = db.select().from(generatedFiles).where(eq(generatedFiles.projectId, projectId)).all()
    const projectDeployments = db.select().from(deployments).where(eq(deployments.projectId, projectId)).all()

    return c.json({
      ...project,
      config: JSON.parse(project.config || '{}'),
      agents: projectAgents,
      tasks: projectTasks,
      artifacts: projectArtifacts,
      conversations: projectConversations,
      logs: projectLogs,
      metrics: projectMetrics.map(m => ({
        ...m,
        agentDurations: JSON.parse(m.agentDurations || '{}'),
      })),
      generatedFiles: projectFiles,
      deployments: projectDeployments.map(d => ({
        ...d,
        stackDetected: JSON.parse(d.stackDetected || '{}'),
      })),
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

  // Get phase metrics for a project
  app.get('/:id/metrics', (c) => {
    const projectId = c.req.param('id')
    const metrics = db.select().from(phaseMetrics).where(eq(phaseMetrics.projectId, projectId)).all()
    return c.json(metrics.map(m => ({
      ...m,
      agentDurations: JSON.parse(m.agentDurations || '{}'),
    })))
  })

  // Get project analytics summary
  app.get('/:id/analytics', (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const metrics = db.select().from(phaseMetrics).where(eq(phaseMetrics.projectId, projectId)).all()
    const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all()
    const projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all()
    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all()
    const projectMessages = db.select().from(messages).where(eq(messages.projectId, projectId)).all()

    // Calculate total duration
    const startTime = project.createdAt ? new Date(project.createdAt).getTime() : 0
    const endTime = project.completedAt ? new Date(project.completedAt).getTime() : Date.now()
    const totalDurationMs = endTime - startTime

    // Phase durations
    const phaseDurations = metrics.map(m => {
      const started = new Date(m.startedAt).getTime()
      const completed = m.completedAt ? new Date(m.completedAt).getTime() : Date.now()
      return {
        phase: m.phase,
        durationMs: completed - started,
        status: m.status,
        agentDurations: JSON.parse(m.agentDurations || '{}'),
        taskCount: m.taskCount,
        artifactCount: m.artifactCount,
        messageCount: m.messageCount,
      }
    })

    // Agent performance
    const agentPerformance = projectAgents.map(agent => {
      const agentTasks = projectTasks.filter(t => t.assigneeId === agent.id)
      const agentArtifacts = projectArtifacts.filter(a => a.agentId === agent.id)
      const agentMessages = projectMessages.filter(m => m.agentId === agent.id)

      // Sum up durations from phase metrics
      let totalAgentDurationMs = 0
      for (const m of metrics) {
        const durations = JSON.parse(m.agentDurations || '{}')
        if (durations[agent.role]?.durationMs) {
          totalAgentDurationMs += durations[agent.role].durationMs
        }
      }

      return {
        agentId: agent.id,
        role: agent.role,
        name: agent.name,
        status: agent.status,
        tasksCompleted: agentTasks.filter(t => t.status === 'done').length,
        tasksTotal: agentTasks.length,
        artifactsCreated: agentArtifacts.length,
        messagesCount: agentMessages.length,
        totalDurationMs: totalAgentDurationMs,
        estimatedHours: agentTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
      }
    })

    // Task breakdown by status
    const taskBreakdown = {
      backlog: projectTasks.filter(t => t.status === 'backlog').length,
      todo: projectTasks.filter(t => t.status === 'todo').length,
      in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
      review: projectTasks.filter(t => t.status === 'review').length,
      done: projectTasks.filter(t => t.status === 'done').length,
    }

    // Artifact breakdown by type
    const artifactBreakdown: Record<string, number> = {}
    for (const art of projectArtifacts) {
      artifactBreakdown[art.type] = (artifactBreakdown[art.type] || 0) + 1
    }

    return c.json({
      totalDurationMs,
      phaseDurations,
      agentPerformance,
      taskBreakdown,
      artifactBreakdown,
      totals: {
        tasks: projectTasks.length,
        artifacts: projectArtifacts.length,
        messages: projectMessages.length,
        conversations: metrics.length,
        estimatedHours: projectTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
      },
    })
  })

  // Search artifacts
  app.get('/:id/artifacts/search', (c) => {
    const projectId = c.req.param('id')
    const query = c.req.query('q') || ''
    const type = c.req.query('type')
    const phase = c.req.query('phase')

    let projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all()

    if (query) {
      const lower = query.toLowerCase()
      projectArtifacts = projectArtifacts.filter(a =>
        a.title.toLowerCase().includes(lower) || a.content.toLowerCase().includes(lower)
      )
    }
    if (type) {
      projectArtifacts = projectArtifacts.filter(a => a.type === type)
    }
    if (phase) {
      projectArtifacts = projectArtifacts.filter(a => a.phase === phase)
    }

    return c.json(projectArtifacts)
  })

  // Get generated files for a project
  app.get('/:id/files', (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Scan actual generated directory
    const projectName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const generatedDir = path.resolve(__dirname, '../../../../generated', projectName)

    const files: Array<{ path: string; type: string; size: number }> = []

    function scanDir(dir: string, prefix = '') {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
              scanDir(path.join(dir, entry.name), relativePath)
            }
          } else {
            const ext = path.extname(entry.name).slice(1)
            const stat = fs.statSync(path.join(dir, entry.name))
            files.push({ path: relativePath, type: ext || 'unknown', size: stat.size })
          }
        }
      } catch { /* directory may not exist */ }
    }

    scanDir(generatedDir)

    // Also return DB-tracked files
    const dbFiles = db.select().from(generatedFiles).where(eq(generatedFiles.projectId, projectId)).all()

    return c.json({
      directory: generatedDir,
      exists: fs.existsSync(generatedDir),
      files,
      trackedFiles: dbFiles,
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    })
  })

  // Read a specific generated file
  app.get('/:id/files/content', (c) => {
    const projectId = c.req.param('id')
    const filePath = c.req.query('path')
    if (!filePath) return c.json({ error: 'path query param required' }, 400)

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const projectName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const generatedDir = path.resolve(__dirname, '../../../../generated', projectName)
    const fullPath = path.resolve(generatedDir, filePath)

    // Security: ensure the resolved path is within the generated directory
    if (!fullPath.startsWith(generatedDir)) {
      return c.json({ error: 'Invalid path' }, 400)
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const stat = fs.statSync(fullPath)
      return c.json({
        path: filePath,
        content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      })
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }
  })

  // Export project data
  app.get('/:id/export', (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all()
    const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all()
    const projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all()
    const projectConversations = db.select().from(conversations).where(eq(conversations.projectId, projectId)).all()
    const projectMessages = db.select().from(messages).where(eq(messages.projectId, projectId)).all()
    const projectLogs = db.select().from(activityLog).where(eq(activityLog.projectId, projectId)).all()
    const projectMetrics = db.select().from(phaseMetrics).where(eq(phaseMetrics.projectId, projectId)).all()

    return c.json({
      exportedAt: new Date().toISOString(),
      version: '2.0',
      project: {
        ...project,
        config: JSON.parse(project.config || '{}'),
      },
      agents: projectAgents,
      tasks: projectTasks,
      artifacts: projectArtifacts,
      conversations: projectConversations,
      messages: projectMessages,
      logs: projectLogs,
      metrics: projectMetrics.map(m => ({
        ...m,
        agentDurations: JSON.parse(m.agentDurations || '{}'),
      })),
    })
  })

  // ── Deployment endpoints ─────────────────────────────────────────────────

  // Get deployment options (stack detection + feasible strategies)
  app.get('/:id/deploy/options', (c) => {
    const projectId = c.req.param('id')
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const projectDir = getProjectDir(project.name)
    if (!fs.existsSync(projectDir)) {
      return c.json({ error: 'Generated project not found — build must complete first', stack: null, options: [] }, 400)
    }

    const stack = detectStack(projectDir)
    const options = getDeploymentOptions(projectDir)

    return c.json({ stack, options, projectDir })
  })

  // Deploy project with a chosen strategy (direct API call for manual deploys)
  app.post('/:id/deploy', async (c) => {
    const projectId = c.req.param('id')
    const body = await c.req.json()
    const { strategy } = body

    if (!strategy || !['docker', 'vercel', 'static'].includes(strategy)) {
      return c.json({ error: 'Invalid strategy. Must be docker, vercel, or static.' }, 400)
    }

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // If workflow is running and awaiting deploy choice, signal it instead
    try {
      const handle = temporalClient.workflow.getHandle(projectId)
      await handle.signal('deploy', { strategy })
      return c.json({ status: 'signaled', message: `Deployment strategy '${strategy}' sent to workflow` })
    } catch {
      // Workflow not running — do a direct deployment
      const result = await redeployProject(projectId, strategy, broadcast)
      return c.json(result, result.success ? 200 : 500)
    }
  })

  // Get all deployments for a project
  app.get('/:id/deployments', (c) => {
    const projectId = c.req.param('id')
    const projectDeployments = db.select().from(deployments).where(eq(deployments.projectId, projectId)).all()
    return c.json(projectDeployments.map(d => ({
      ...d,
      stackDetected: JSON.parse(d.stackDetected || '{}'),
    })))
  })

  // Stop a deployment
  app.post('/:id/deployments/:deploymentId/stop', async (c) => {
    const deploymentId = c.req.param('deploymentId')
    await stopDeployment(deploymentId, broadcast)
    return c.json({ status: 'stopped' })
  })

  // Check deployment health
  app.get('/:id/deployments/:deploymentId/health', async (c) => {
    const deploymentId = c.req.param('deploymentId')
    const health = await checkDeploymentHealth(deploymentId)
    return c.json(health)
  })

  // Clean up obsolete deployments
  app.post('/:id/deployments/cleanup', async (c) => {
    const projectId = c.req.param('id')
    const removed = await removeObsoleteDeployments(projectId, broadcast)
    return c.json({ removed })
  })

  // Get deployment logs
  app.get('/:id/deployments/:deploymentId/logs', (c) => {
    const deploymentId = c.req.param('deploymentId')
    const deployment = db.select().from(deployments).where(eq(deployments.id, deploymentId)).get()
    if (!deployment) return c.json({ error: 'Deployment not found' }, 404)
    return c.json({
      buildLog: deployment.buildLog,
      errorLog: deployment.errorLog,
    })
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

    // Stop any running deployments before deleting
    const projectDeployments = db.select().from(deployments).where(eq(deployments.projectId, projectId)).all()
    for (const dep of projectDeployments) {
      if (dep.status === 'running') {
        await stopDeployment(dep.id, broadcast)
      }
    }
    db.delete(deployments).where(eq(deployments.projectId, projectId)).run()
    db.delete(generatedFiles).where(eq(generatedFiles.projectId, projectId)).run()
    db.delete(phaseMetrics).where(eq(phaseMetrics.projectId, projectId)).run()
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
