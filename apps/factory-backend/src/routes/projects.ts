import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, agents, conversations, messages, tasks, artifacts, activityLog } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { AgentEngine } from '../agents/engine.js';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  config: z.object({
    stack: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    billingMode: z.enum(['subscription', 'usage', 'none']).optional(),
  }).optional(),
});

export function createProjectRoutes(engine: AgentEngine) {
  const app = new Hono();

  // List all projects
  app.get('/', (c) => {
    const allProjects = db.select().from(projects).all();
    const enriched = allProjects.map(p => {
      const projectAgents = db.select().from(agents).where(eq(agents.projectId, p.id)).all();
      const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, p.id)).all();
      const doneTasks = projectTasks.filter(t => t.status === 'done').length;
      return {
        ...p,
        config: JSON.parse(p.config || '{}'),
        agentCount: projectAgents.length,
        taskCount: projectTasks.length,
        completedTaskCount: doneTasks,
        progress: projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0,
      };
    });
    return c.json(enriched);
  });

  // Get project detail
  app.get('/:id', (c) => {
    const projectId = c.req.param('id');
    const status = engine.getProjectStatus(projectId);
    if (!status) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(status);
  });

  // Create project
  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400);
    }

    const { name, description, config } = parsed.data;
    const projectId = await engine.createProject(name, description, config || {});

    return c.json({ id: projectId, status: 'created' }, 201);
  });

  // Start project (kicks off agent orchestration)
  app.post('/:id/start', async (c) => {
    const projectId = c.req.param('id');
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    if (engine.isRunning(projectId)) {
      return c.json({ error: 'Project is already running' }, 409);
    }

    await engine.startProject(projectId);
    return c.json({ status: 'started' });
  });

  // Pause project
  app.post('/:id/pause', async (c) => {
    const projectId = c.req.param('id');
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    if (!engine.isRunning(projectId)) {
      return c.json({ error: 'Project is not running' }, 409);
    }

    await engine.pauseProject(projectId);
    return c.json({ status: 'paused' });
  });

  // Get project agents
  app.get('/:id/agents', (c) => {
    const projectId = c.req.param('id');
    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all();
    return c.json(projectAgents);
  });

  // Get project conversations
  app.get('/:id/conversations', (c) => {
    const projectId = c.req.param('id');
    const convos = db.select().from(conversations).where(eq(conversations.projectId, projectId)).all();
    return c.json(convos);
  });

  // Get conversation messages
  app.get('/:id/conversations/:convId/messages', (c) => {
    const convId = c.req.param('convId');
    const msgs = db.select().from(messages).where(eq(messages.conversationId, convId)).all();
    return c.json(msgs);
  });

  // Get project tasks
  app.get('/:id/tasks', (c) => {
    const projectId = c.req.param('id');
    const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all();
    return c.json(projectTasks);
  });

  // Update task status
  app.patch('/:id/tasks/:taskId', async (c) => {
    const taskId = c.req.param('taskId');
    const body = await c.req.json();
    const { status, assigneeId } = body;

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (assigneeId) updates.assigneeId = assigneeId;
    if (status === 'done') updates.completedAt = new Date();

    db.update(tasks).set(updates).where(eq(tasks.id, taskId)).run();
    return c.json({ status: 'updated' });
  });

  // Get project artifacts
  app.get('/:id/artifacts', (c) => {
    const projectId = c.req.param('id');
    const projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all();
    return c.json(projectArtifacts);
  });

  // Get project activity log
  app.get('/:id/logs', (c) => {
    const projectId = c.req.param('id');
    const logs = db.select().from(activityLog).where(eq(activityLog.projectId, projectId)).all();
    return c.json(logs);
  });

  // Get coding agent status
  app.get('/:id/coding-agent', (c) => {
    return c.json(engine.getCodingAgentStatus());
  });

  // Delete project
  app.delete('/:id', (c) => {
    const projectId = c.req.param('id');

    if (engine.isRunning(projectId)) {
      return c.json({ error: 'Cannot delete a running project' }, 409);
    }

    // Delete in correct order due to foreign keys
    db.delete(activityLog).where(eq(activityLog.projectId, projectId)).run();
    db.delete(artifacts).where(eq(artifacts.projectId, projectId)).run();
    db.delete(tasks).where(eq(tasks.projectId, projectId)).run();
    db.delete(messages).where(eq(messages.projectId, projectId)).run();
    db.delete(conversations).where(eq(conversations.projectId, projectId)).run();
    db.delete(agents).where(eq(agents.projectId, projectId)).run();
    db.delete(projects).where(eq(projects.id, projectId)).run();

    return c.json({ status: 'deleted' });
  });

  return app;
}
