import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { projects, agents, conversations, messages, tasks, artifacts, activityLog } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AGENT_ROLES, PHASE_AGENTS, getNextPhase, type AgentRole } from './roles.js';
import { callLLM } from './llm.js';

type BroadcastFn = (event: any) => void;

export class AgentEngine {
  private broadcast: BroadcastFn;
  private runningProjects: Set<string> = new Set();

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
  }

  async createProject(name: string, description: string, config: Record<string, any> = {}): Promise<string> {
    const projectId = uuid();
    const now = new Date();

    db.insert(projects).values({
      id: projectId,
      name,
      description,
      status: 'planning',
      currentPhase: 'requirements',
      config: JSON.stringify(config),
      createdAt: now,
      updatedAt: now,
    }).run();

    // Create all agents for this project
    const agentIds: Record<AgentRole, string> = {} as any;
    for (const [role, config] of Object.entries(AGENT_ROLES)) {
      const agentId = uuid();
      agentIds[role as AgentRole] = agentId;
      db.insert(agents).values({
        id: agentId,
        projectId,
        role: role as AgentRole,
        name: config.name,
        status: 'idle',
        progress: 0,
        createdAt: now,
      }).run();
    }

    this.logActivity(projectId, null, null, 'Project created', `Project "${name}" initialized with ${Object.keys(AGENT_ROLES).length} agents`, 'milestone', 'requirements');

    this.broadcast({
      type: 'project:created',
      payload: { projectId, name, description },
    });

    return projectId;
  }

  async startProject(projectId: string): Promise<void> {
    if (this.runningProjects.has(projectId)) {
      throw new Error('Project is already running');
    }

    this.runningProjects.add(projectId);

    db.update(projects)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run();

    this.broadcast({
      type: 'project:started',
      payload: { projectId },
    });

    // Start the orchestration loop
    this.runPhase(projectId, 'requirements').catch(err => {
      console.error(`[Engine] Project ${projectId} failed:`, err);
      this.runningProjects.delete(projectId);
      db.update(projects)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .run();
      this.broadcast({
        type: 'project:failed',
        payload: { projectId, error: err.message },
      });
    });
  }

  private async runPhase(projectId: string, phase: string): Promise<void> {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) throw new Error('Project not found');

    // Update project phase
    db.update(projects)
      .set({ currentPhase: phase as any, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run();

    this.broadcast({
      type: 'phase:started',
      payload: { projectId, phase },
    });

    this.logActivity(projectId, null, null, `Phase started: ${phase}`, `Entering ${phase} phase`, 'milestone', phase);

    // Get agents for this phase
    const phaseAgents = PHASE_AGENTS[phase] || [];
    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all();

    // Create a conversation for this phase
    const conversationId = uuid();
    db.insert(conversations).values({
      id: conversationId,
      projectId,
      title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase Discussion`,
      phase,
      status: 'active',
      createdAt: new Date(),
    }).run();

    // Run each agent's work for this phase
    for (const role of phaseAgents) {
      const agent = projectAgents.find(a => a.role === role);
      if (!agent) continue;

      await this.runAgentWork(projectId, agent, phase, conversationId, project);
    }

    // Complete the conversation
    db.update(conversations)
      .set({ status: 'resolved' })
      .where(eq(conversations.id, conversationId))
      .run();

    this.broadcast({
      type: 'phase:completed',
      payload: { projectId, phase },
    });

    this.logActivity(projectId, null, null, `Phase completed: ${phase}`, `${phase} phase finished successfully`, 'success', phase);

    // Move to next phase
    const nextPhase = getNextPhase(phase);
    if (nextPhase && nextPhase !== 'completed') {
      await this.runPhase(projectId, nextPhase);
    } else {
      // Project complete
      this.runningProjects.delete(projectId);
      db.update(projects)
        .set({ status: 'completed', currentPhase: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .run();

      this.broadcast({
        type: 'project:completed',
        payload: { projectId },
      });

      this.logActivity(projectId, null, null, 'Project completed', 'All phases finished successfully', 'milestone', 'completed');
    }
  }

  private async runAgentWork(
    projectId: string,
    agent: any,
    phase: string,
    conversationId: string,
    project: any
  ): Promise<void> {
    const roleConfig = AGENT_ROLES[agent.role as AgentRole];
    if (!roleConfig) return;

    // Update agent status
    db.update(agents)
      .set({ status: 'thinking', currentTask: `Analyzing ${phase} requirements` })
      .where(eq(agents.id, agent.id))
      .run();

    this.broadcast({
      type: 'agent:status',
      payload: { projectId, agentId: agent.id, role: agent.role, status: 'thinking', task: `Analyzing ${phase} requirements` },
    });

    // Build context from previous conversations and artifacts
    const previousMessages = db.select().from(messages)
      .where(eq(messages.projectId, projectId))
      .all();

    const existingArtifacts = db.select().from(artifacts)
      .where(eq(artifacts.projectId, projectId))
      .all();

    const contextParts = [
      `Project: ${project.name}`,
      `Description: ${project.description}`,
      `Current Phase: ${phase}`,
      `Your Role: ${roleConfig.name}`,
    ];

    if (project.config && project.config !== '{}') {
      try {
        const config = JSON.parse(project.config);
        if (config.stack?.length) contextParts.push(`Tech Stack: ${config.stack.join(', ')}`);
        if (config.features?.length) contextParts.push(`Features: ${config.features.join(', ')}`);
      } catch {}
    }

    if (existingArtifacts.length > 0) {
      contextParts.push('\n--- Previous Artifacts ---');
      for (const artifact of existingArtifacts.slice(-5)) {
        contextParts.push(`[${artifact.type}] ${artifact.title}:\n${artifact.content.substring(0, 1000)}`);
      }
    }

    if (previousMessages.length > 0) {
      contextParts.push('\n--- Recent Team Discussions ---');
      for (const msg of previousMessages.slice(-10)) {
        contextParts.push(`[${msg.agentRole}]: ${msg.content.substring(0, 200)}`);
      }
    }

    const prompt = this.getPhasePrompt(phase, agent.role, project);

    // Update to working status
    db.update(agents)
      .set({ status: 'working', progress: 25 })
      .where(eq(agents.id, agent.id))
      .run();

    this.broadcast({
      type: 'agent:progress',
      payload: { projectId, agentId: agent.id, role: agent.role, progress: 25, status: 'working' },
    });

    // Call LLM
    const response = await callLLM(roleConfig.systemPrompt, [
      { role: 'user', content: contextParts.join('\n') + '\n\n' + prompt },
    ]);

    // Update progress
    db.update(agents)
      .set({ progress: 75 })
      .where(eq(agents.id, agent.id))
      .run();

    this.broadcast({
      type: 'agent:progress',
      payload: { projectId, agentId: agent.id, role: agent.role, progress: 75, status: 'working' },
    });

    // Save the message
    const messageId = uuid();
    db.insert(messages).values({
      id: messageId,
      conversationId,
      projectId,
      agentId: agent.id,
      agentRole: agent.role,
      content: response.content,
      messageType: this.getMessageType(phase, agent.role) as any,
      createdAt: new Date(),
    }).run();

    this.broadcast({
      type: 'message:created',
      payload: {
        projectId,
        conversationId,
        message: {
          id: messageId,
          agentId: agent.id,
          agentRole: agent.role,
          content: response.content,
          messageType: this.getMessageType(phase, agent.role),
          createdAt: new Date().toISOString(),
        },
      },
    });

    // Create artifact from the work
    const artifactId = uuid();
    const artifactType = this.getArtifactType(phase, agent.role);
    if (artifactType) {
      db.insert(artifacts).values({
        id: artifactId,
        projectId,
        agentId: agent.id,
        title: `${roleConfig.name} - ${phase} Output`,
        type: artifactType as any,
        content: response.content,
        phase,
        createdAt: new Date(),
      }).run();

      this.broadcast({
        type: 'artifact:created',
        payload: { projectId, artifactId, title: `${roleConfig.name} - ${phase} Output`, type: artifactType },
      });
    }

    // Create tasks based on the phase and role
    await this.createTasksFromWork(projectId, agent, phase, response.content);

    // Mark agent as done
    db.update(agents)
      .set({ status: 'done', progress: 100, currentTask: null })
      .where(eq(agents.id, agent.id))
      .run();

    this.broadcast({
      type: 'agent:status',
      payload: { projectId, agentId: agent.id, role: agent.role, status: 'done', progress: 100 },
    });

    this.logActivity(projectId, agent.id, agent.role, `${roleConfig.name} completed work`, `Finished ${phase} phase tasks`, 'success', phase);

    // Small delay between agents for visual effect
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private getPhasePrompt(phase: string, role: string, project: any): string {
    const base = `Please perform your ${phase} phase responsibilities for this project.`;

    switch (phase) {
      case 'requirements':
        if (role === 'pm') return `${base} Create a project plan with sprints, milestones, and team assignments.`;
        if (role === 'ba') return `${base} Analyze the project description and create detailed requirements, user stories, and acceptance criteria.`;
        break;
      case 'architecture':
        if (role === 'pm') return `${base} Review the architecture proposal and provide feedback on feasibility and timeline.`;
        if (role === 'architect') return `${base} Design the system architecture, choose the technology stack, define API contracts, and create the database schema.`;
        break;
      case 'development':
        if (role === 'pm') return `${base} Track development progress and coordinate between frontend and backend developers.`;
        if (role === 'frontend_dev') return `${base} Implement the frontend components, pages, routing, and state management based on the architecture.`;
        if (role === 'backend_dev') return `${base} Implement the backend API endpoints, database operations, and business logic based on the architecture.`;
        break;
      case 'testing':
        if (role === 'pm') return `${base} Review test results and coordinate bug fixes.`;
        if (role === 'qa') return `${base} Create test plans, write test cases, and report any issues found.`;
        if (role === 'frontend_dev') return `${base} Fix any frontend bugs found during testing.`;
        if (role === 'backend_dev') return `${base} Fix any backend bugs found during testing.`;
        break;
      case 'deployment':
        if (role === 'pm') return `${base} Coordinate the deployment process and verify the launch checklist.`;
        if (role === 'devops') return `${base} Set up the deployment pipeline, Docker configuration, and CI/CD. Deploy to production.`;
        break;
    }

    return base;
  }

  private getMessageType(phase: string, role: string): string {
    if (role === 'pm') return 'decision';
    if (phase === 'requirements') return 'discussion';
    if (phase === 'architecture') return 'discussion';
    if (phase === 'testing') return 'review';
    return 'task_update';
  }

  private getArtifactType(phase: string, role: string): string | null {
    if (phase === 'requirements' && role === 'ba') return 'spec';
    if (phase === 'requirements' && role === 'pm') return 'documentation';
    if (phase === 'architecture' && role === 'architect') return 'architecture';
    if (phase === 'development' && role === 'frontend_dev') return 'code';
    if (phase === 'development' && role === 'backend_dev') return 'code';
    if (phase === 'testing' && role === 'qa') return 'test_report';
    if (phase === 'deployment' && role === 'devops') return 'deployment_config';
    return null;
  }

  private async createTasksFromWork(projectId: string, agent: any, phase: string, content: string): Promise<void> {
    const now = new Date();
    const taskTemplates = this.getTaskTemplates(phase, agent.role);

    for (const template of taskTemplates) {
      const taskId = uuid();
      db.insert(tasks).values({
        id: taskId,
        projectId,
        assigneeId: agent.id,
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
      }).run();

      this.broadcast({
        type: 'task:created',
        payload: { projectId, taskId, title: template.title, status: 'done', assigneeId: agent.id, phase },
      });
    }
  }

  private getTaskTemplates(phase: string, role: string): Array<{ title: string; description: string; priority: string; sprint: number; hours: number }> {
    const templates: Record<string, Record<string, Array<{ title: string; description: string; priority: string; sprint: number; hours: number }>>> = {
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
          { title: 'Unit tests', description: 'Write unit tests for critical functions', priority: 'high', sprint: 3, hours: 8 },
          { title: 'Integration tests', description: 'Write integration tests for API endpoints', priority: 'high', sprint: 3, hours: 6 },
          { title: 'Security testing', description: 'Perform security audit and penetration testing', priority: 'critical', sprint: 3, hours: 4 },
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
    };

    return templates[phase]?.[role] || [];
  }

  private logActivity(projectId: string, agentId: string | null, agentRole: string | null, action: string, details: string, logType: string, phase: string | null): void {
    const id = uuid();
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
    }).run();

    this.broadcast({
      type: 'activity:log',
      payload: { projectId, id, agentId, agentRole, action, details, logType, phase, createdAt: new Date().toISOString() },
    });
  }

  getProjectStatus(projectId: string) {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return null;

    const projectAgents = db.select().from(agents).where(eq(agents.projectId, projectId)).all();
    const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all();
    const projectArtifacts = db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).all();
    const projectConversations = db.select().from(conversations).where(eq(conversations.projectId, projectId)).all();
    const projectLogs = db.select().from(activityLog).where(eq(activityLog.projectId, projectId)).all();

    return {
      ...project,
      config: JSON.parse(project.config || '{}'),
      agents: projectAgents,
      tasks: projectTasks,
      artifacts: projectArtifacts,
      conversations: projectConversations,
      logs: projectLogs,
    };
  }

  isRunning(projectId: string): boolean {
    return this.runningProjects.has(projectId);
  }
}
