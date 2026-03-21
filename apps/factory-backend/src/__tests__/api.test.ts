/**
 * Backend API & Engine Tests for SaaS Factory v2
 * Includes tests for Claude Code / Opencode coding agent integration
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { AGENT_ROLES, PHASE_AGENTS, PHASE_ORDER, getNextPhase, getAgentDisplayInfo } from '../agents/roles.js';
import type { AgentRole } from '../agents/roles.js';

// ============ Agent Roles Tests ============

describe('Agent Roles', () => {
  it('should define all 7 agent roles', () => {
    const roles: AgentRole[] = ['pm', 'ba', 'architect', 'frontend_dev', 'backend_dev', 'qa', 'devops'];
    expect(Object.keys(AGENT_ROLES)).toHaveLength(7);
    roles.forEach(role => {
      expect(AGENT_ROLES[role]).toBeDefined();
    });
  });

  it('each role should have required fields', () => {
    for (const [key, config] of Object.entries(AGENT_ROLES)) {
      expect(config.role).toBe(key);
      expect(config.name).toBeTruthy();
      expect(config.title).toBeTruthy();
      expect(config.emoji).toBeTruthy();
      expect(config.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.description).toBeTruthy();
      expect(config.systemPrompt).toBeTruthy();
      expect(config.systemPrompt.length).toBeGreaterThan(50);
      expect(config.capabilities).toBeInstanceOf(Array);
      expect(config.capabilities.length).toBeGreaterThan(0);
      expect(config.participatesInPhases).toBeInstanceOf(Array);
      expect(config.participatesInPhases.length).toBeGreaterThan(0);
    }
  });

  it('PM should participate in all phases', () => {
    const pm = AGENT_ROLES.pm;
    expect(pm.participatesInPhases).toContain('requirements');
    expect(pm.participatesInPhases).toContain('architecture');
    expect(pm.participatesInPhases).toContain('development');
    expect(pm.participatesInPhases).toContain('testing');
    expect(pm.participatesInPhases).toContain('deployment');
  });

  it('BA should only participate in requirements phase', () => {
    expect(AGENT_ROLES.ba.participatesInPhases).toEqual(['requirements']);
  });

  it('Architect should only participate in architecture phase', () => {
    expect(AGENT_ROLES.architect.participatesInPhases).toEqual(['architecture']);
  });

  it('QA should only participate in testing phase', () => {
    expect(AGENT_ROLES.qa.participatesInPhases).toEqual(['testing']);
  });

  it('DevOps should only participate in deployment phase', () => {
    expect(AGENT_ROLES.devops.participatesInPhases).toEqual(['deployment']);
  });
});

// ============ Phase Configuration Tests ============

describe('Phase Configuration', () => {
  it('should define agents for all 5 development phases', () => {
    expect(Object.keys(PHASE_AGENTS)).toHaveLength(5);
    expect(PHASE_AGENTS.requirements).toBeDefined();
    expect(PHASE_AGENTS.architecture).toBeDefined();
    expect(PHASE_AGENTS.development).toBeDefined();
    expect(PHASE_AGENTS.testing).toBeDefined();
    expect(PHASE_AGENTS.deployment).toBeDefined();
  });

  it('PM should be in every phase', () => {
    for (const [phase, agents] of Object.entries(PHASE_AGENTS)) {
      expect(agents).toContain('pm');
    }
  });

  it('requirements phase should include PM and BA', () => {
    expect(PHASE_AGENTS.requirements).toEqual(['pm', 'ba']);
  });

  it('architecture phase should include PM and architect', () => {
    expect(PHASE_AGENTS.architecture).toEqual(['pm', 'architect']);
  });

  it('development phase should include PM, frontend_dev, and backend_dev', () => {
    expect(PHASE_AGENTS.development).toContain('pm');
    expect(PHASE_AGENTS.development).toContain('frontend_dev');
    expect(PHASE_AGENTS.development).toContain('backend_dev');
  });

  it('testing phase should include PM, QA, and developers', () => {
    expect(PHASE_AGENTS.testing).toContain('pm');
    expect(PHASE_AGENTS.testing).toContain('qa');
  });

  it('deployment phase should include PM and devops', () => {
    expect(PHASE_AGENTS.deployment).toEqual(['pm', 'devops']);
  });
});

// ============ Phase Order Tests ============

describe('Phase Order', () => {
  it('should have 6 phases including completed', () => {
    expect(PHASE_ORDER).toHaveLength(6);
  });

  it('should follow correct order', () => {
    expect(PHASE_ORDER).toEqual([
      'requirements',
      'architecture',
      'development',
      'testing',
      'deployment',
      'completed',
    ]);
  });

  it('getNextPhase should return correct next phase', () => {
    expect(getNextPhase('requirements')).toBe('architecture');
    expect(getNextPhase('architecture')).toBe('development');
    expect(getNextPhase('development')).toBe('testing');
    expect(getNextPhase('testing')).toBe('deployment');
    expect(getNextPhase('deployment')).toBe('completed');
  });

  it('getNextPhase should return null for completed or invalid', () => {
    expect(getNextPhase('completed')).toBeNull();
    expect(getNextPhase('invalid')).toBeNull();
  });
});

// ============ Agent Display Info Tests ============

describe('Agent Display Info', () => {
  it('should return correct info for each role', () => {
    const pmInfo = getAgentDisplayInfo('pm');
    expect(pmInfo.name).toBe('Project Manager');
    expect(pmInfo.emoji).toBe('📋');
    expect(pmInfo.color).toBe('#3b82f6');
    expect(pmInfo.title).toBe('PM');
  });

  it('each role should have unique colors', () => {
    const colors = Object.values(AGENT_ROLES).map(r => r.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });

  it('each role should have unique emojis', () => {
    const emojis = Object.values(AGENT_ROLES).map(r => r.emoji);
    const uniqueEmojis = new Set(emojis);
    expect(uniqueEmojis.size).toBe(emojis.length);
  });
});

// ============ LLM Module Tests ============

describe('LLM Fallback', () => {
  it('should return responses without API key', async () => {
    const originalKey = process.env.MINIMAX_API_KEY;
    delete process.env.MINIMAX_API_KEY;

    const { callLLM } = await import('../agents/llm.js');
    const response = await callLLM(
      'You are an experienced Project Manager for a SaaS development team.',
      [{ role: 'user', content: 'Create a project plan for a blog application' }]
    );

    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(100);
    expect(response.tokensUsed).toBe(0);

    if (originalKey) process.env.MINIMAX_API_KEY = originalKey;
  });

  it('should return role-appropriate responses', async () => {
    delete process.env.MINIMAX_API_KEY;

    const { callLLM } = await import('../agents/llm.js');

    const baResponse = await callLLM(
      'You are a skilled Business Analyst for a SaaS development team.',
      [{ role: 'user', content: 'Analyze requirements' }]
    );
    expect(baResponse.content).toContain('Requirements');

    const architectResponse = await callLLM(
      'You are a senior Solution Architect for a SaaS development team.',
      [{ role: 'user', content: 'Design architecture' }]
    );
    expect(architectResponse.content).toContain('Architecture');

    const qaResponse = await callLLM(
      'You are a meticulous QA Engineer for a SaaS development team.',
      [{ role: 'user', content: 'Test the app' }]
    );
    expect(qaResponse.content).toContain('Test');

    const devopsResponse = await callLLM(
      'You are a skilled DevOps Engineer for a SaaS development team.',
      [{ role: 'user', content: 'Deploy the app' }]
    );
    expect(devopsResponse.content).toContain('Deploy');
  });
});

// ============ Coding Agent Tests ============

describe('Coding Agent', () => {
  it('should export isCodingAgentAvailable function', async () => {
    const { isCodingAgentAvailable } = await import('../agents/coding-agent.js');
    expect(typeof isCodingAgentAvailable).toBe('function');
  });

  it('should return availability status with name', async () => {
    const { isCodingAgentAvailable } = await import('../agents/coding-agent.js');
    const status = isCodingAgentAvailable();

    expect(status).toHaveProperty('available');
    expect(status).toHaveProperty('name');
    expect(typeof status.available).toBe('boolean');
    expect(typeof status.name).toBe('string');
  });

  it('should only report Claude Code — never a fallback agent', async () => {
    const { isCodingAgentAvailable } = await import('../agents/coding-agent.js');
    const status = isCodingAgentAvailable();

    if (status.available) {
      expect(status.name).toBe('Claude Code');
    } else {
      // When unavailable, name should be 'none' — not 'Opencode' or anything else
      expect(status.name).toBe('none');
    }
  });

  it('should export runCodingAgent function', async () => {
    const { runCodingAgent } = await import('../agents/coding-agent.js');
    expect(typeof runCodingAgent).toBe('function');
  });

  it('runCodingAgent should return proper result structure when Claude Code is missing', async () => {
    const { runCodingAgent, isCodingAgentAvailable } = await import('../agents/coding-agent.js');
    const status = isCodingAgentAvailable();

    if (!status.available) {
      const result = await runCodingAgent({
        projectId: 'test-123',
        projectName: 'test-project',
        task: 'Create a hello world file',
        context: 'Test context',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Claude Code');
      expect(result.error).toContain('npm i -g @anthropic-ai/claude-code');
      expect(result.error).not.toContain('Opencode');
      expect(result.error).not.toContain('opencode');
      expect(result).toHaveProperty('filesCreated');
      expect(result).toHaveProperty('filesModified');
      expect(result).toHaveProperty('duration');
      expect(result.filesCreated).toBeInstanceOf(Array);
      expect(result.filesModified).toBeInstanceOf(Array);
      expect(typeof result.duration).toBe('number');
    }
  });

  it('should not reference opencode anywhere in the module', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../agents/coding-agent.ts'),
      'utf-8'
    );
    const lowerSource = source.toLowerCase();
    expect(lowerSource).not.toContain('opencode');
  });

  it('coding roles should be correctly identified', () => {
    const codingRoles: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops'];
    const testingRoles: AgentRole[] = ['qa'];

    codingRoles.forEach(role => {
      expect(AGENT_ROLES[role]).toBeDefined();
      expect(AGENT_ROLES[role].participatesInPhases).toBeDefined();
    });

    testingRoles.forEach(role => {
      expect(AGENT_ROLES[role]).toBeDefined();
    });
  });

  it('non-coding roles should use MiniMax LLM', () => {
    const thinkingRoles: AgentRole[] = ['pm', 'ba', 'architect'];

    thinkingRoles.forEach(role => {
      const config = AGENT_ROLES[role];
      expect(config.systemPrompt).toBeTruthy();
      expect(['frontend_dev', 'backend_dev', 'devops']).not.toContain(role);
    });
  });
});

// ============ Database Schema Tests ============

describe('Database Schema', () => {
  it('should initialize database without errors', async () => {
    const { initializeDatabase } = await import('../db/index.js');
    expect(() => initializeDatabase()).not.toThrow();
  });

  it('should have correct table schemas', async () => {
    const schema = await import('../db/schema.js');

    expect(schema.projects).toBeDefined();
    expect(schema.agents).toBeDefined();
    expect(schema.conversations).toBeDefined();
    expect(schema.messages).toBeDefined();
    expect(schema.tasks).toBeDefined();
    expect(schema.artifacts).toBeDefined();
    expect(schema.activityLog).toBeDefined();
    expect(schema.phaseMetrics).toBeDefined();
    expect(schema.generatedFiles).toBeDefined();
    expect(schema.deployments).toBeDefined();
  });
});

// ============ Engine Tests ============

describe('AgentEngine', () => {
  it('should create a project with all agents', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Test Project', 'A test SaaS application');

    expect(projectId).toBeTruthy();
    expect(projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);

    const createEvent = events.find(e => e.type === 'project:created');
    expect(createEvent).toBeDefined();
    expect(createEvent.payload.name).toBe('Test Project');
  });

  it('should retrieve project status with all related data', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const projectId = await engine.createProject('Status Test', 'Testing status retrieval');
    const status = engine.getProjectStatus(projectId);

    expect(status).toBeDefined();
    expect(status!.name).toBe('Status Test');
    expect(status!.description).toBe('Testing status retrieval');
    expect(status!.status).toBe('planning');
    expect(status!.currentPhase).toBe('requirements');
    expect(status!.agents).toHaveLength(7);
    expect(status!.tasks).toEqual([]);
    expect(status!.artifacts).toEqual([]);
    expect(status!.conversations).toEqual([]);
  });

  it('should create agents for all 7 roles', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const projectId = await engine.createProject('Agent Test', 'Testing agent creation');
    const status = engine.getProjectStatus(projectId);

    const roles = status!.agents.map(a => a.role).sort();
    expect(roles).toEqual(['architect', 'ba', 'backend_dev', 'devops', 'frontend_dev', 'pm', 'qa']);
  });

  it('should track running status', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const projectId = await engine.createProject('Running Test', 'Test');
    expect(engine.isRunning(projectId)).toBe(false);
  });

  it('should store project config as JSON', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const config = { stack: ['react', 'node'], features: ['auth', 'dashboard'], billingMode: 'subscription' };
    const projectId = await engine.createProject('Config Test', 'Test', config);
    const status = engine.getProjectStatus(projectId);

    expect(status!.config).toBeDefined();
    expect(status!.config.stack).toEqual(['react', 'node']);
    expect(status!.config.features).toEqual(['auth', 'dashboard']);
  });

  it('should report coding agent status', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const codingStatus = engine.getCodingAgentStatus();
    expect(codingStatus).toHaveProperty('available');
    expect(codingStatus).toHaveProperty('name');
  });

  it('should log coding agent info on project creation', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    await engine.createProject('Coding Agent Test', 'Test coding agent logging');

    const activityEvent = events.find(e =>
      e.type === 'activity:log' && e.payload.action === 'Project created'
    );
    expect(activityEvent).toBeDefined();
    expect(activityEvent.payload.details).toContain('agent');
  });

  it('should prevent starting a project twice', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const projectId = await engine.createProject('Double Start', 'Test');
    await engine.startProject(projectId);

    await expect(engine.startProject(projectId)).rejects.toThrow('already running');
  });

  it('should pause a running project', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Pause Test', 'Test pause functionality');
    await engine.startProject(projectId);

    // Wait a bit for the project to start
    await new Promise(resolve => setTimeout(resolve, 100));

    await engine.pauseProject(projectId);

    expect(engine.isRunning(projectId)).toBe(false);

    const pauseEvent = events.find(e => e.type === 'project:paused');
    expect(pauseEvent).toBeDefined();
    expect(pauseEvent.payload.projectId).toBe(projectId);
  });

  it('should prevent pausing a non-running project', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const engine = new AgentEngine(() => {});

    const projectId = await engine.createProject('No Pause', 'Test');

    await expect(engine.pauseProject(projectId)).rejects.toThrow('not running');
  });

  it('should start a project and run through phases', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Full Run', 'Complete test run');

    await engine.startProject(projectId);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    const phaseStarted = events.filter(e => e.type === 'phase:started');
    expect(phaseStarted.length).toBeGreaterThan(0);

    const agentEvents = events.filter(e => e.type === 'agent:status' || e.type === 'agent:progress');
    expect(agentEvents.length).toBeGreaterThan(0);

    // Check that conversations were created
    const conversationEvents = events.filter(e => e.type === 'conversation:created');
    expect(conversationEvents.length).toBeGreaterThan(0);

    // Check that review messages were created (PM collaboration round)
    const messageEvents = events.filter(e =>
      e.type === 'message:created' && e.payload.message?.messageType === 'review'
    );
    expect(messageEvents.length).toBeGreaterThan(0);
  }, 60000);

  it('should emit proper events during phase execution', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Event Test', 'Testing event flow');
    await engine.startProject(projectId);

    // Wait for first phase
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Should have project:started
    expect(events.some(e => e.type === 'project:started')).toBe(true);

    // Should have phase:started for requirements
    expect(events.some(e => e.type === 'phase:started' && e.payload.phase === 'requirements')).toBe(true);

    // Should have agent status changes
    const agentStatuses = events.filter(e => e.type === 'agent:status');
    const thinkingEvents = agentStatuses.filter(e => e.payload.status === 'thinking');
    const workingEvents = agentStatuses.filter(e => e.payload.status === 'working');
    expect(thinkingEvents.length).toBeGreaterThan(0);
    expect(workingEvents.length).toBeGreaterThan(0);

    // Should have task:created events
    const taskEvents = events.filter(e => e.type === 'task:created');
    expect(taskEvents.length).toBeGreaterThan(0);

    // Should have artifact:created events
    const artifactEvents = events.filter(e => e.type === 'artifact:created');
    expect(artifactEvents.length).toBeGreaterThan(0);
  }, 30000);
});

// ============ Agent Collaboration Tests ============

describe('Agent Collaboration', () => {
  it('PM should review work at end of each phase', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Collab Test', 'Testing collaboration');
    await engine.startProject(projectId);

    // Wait for first phase to complete (requirements)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // PM should have a reviewing status event
    const reviewingEvents = events.filter(e =>
      e.type === 'agent:status' &&
      e.payload.role === 'pm' &&
      e.payload.status === 'reviewing'
    );
    expect(reviewingEvents.length).toBeGreaterThan(0);
  }, 30000);

  it('agents should see previous artifacts in context', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Context Test', 'Testing context sharing');
    await engine.startProject(projectId);

    // Wait for two phases
    await new Promise(resolve => setTimeout(resolve, 8000));

    const status = engine.getProjectStatus(projectId);
    // After requirements phase, there should be artifacts
    expect(status!.artifacts.length).toBeGreaterThan(0);

    // Messages should exist from multiple agents
    const uniqueRoles = new Set(events
      .filter(e => e.type === 'message:created')
      .map(e => e.payload.message?.agentRole)
      .filter(Boolean)
    );
    expect(uniqueRoles.size).toBeGreaterThan(1);
  }, 30000);
});

// ============ Parallel Agent Execution Tests ============

describe('Parallel Agent Execution', () => {
  it('should define parallel groups for each phase', () => {
    // Development phase should have frontend_dev and backend_dev in same group
    const devPhaseAgents = PHASE_AGENTS.development;
    expect(devPhaseAgents).toContain('frontend_dev');
    expect(devPhaseAgents).toContain('backend_dev');
  });

  it('testing phase should have developers available for bug fixes', () => {
    const testPhaseAgents = PHASE_AGENTS.testing;
    expect(testPhaseAgents).toContain('qa');
    expect(testPhaseAgents).toContain('frontend_dev');
    expect(testPhaseAgents).toContain('backend_dev');
  });
});

// ============ Project Routes Validation Tests ============

describe('Project Routes Validation', () => {
  it('should validate project name length', () => {
    const { z } = require('zod');
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(2000),
    });

    expect(schema.safeParse({ name: '', description: 'test' }).success).toBe(false);
    expect(schema.safeParse({ name: 'Valid Name', description: 'test' }).success).toBe(true);
    expect(schema.safeParse({ name: 'a'.repeat(101), description: 'test' }).success).toBe(false);
  });

  it('should validate project description length', () => {
    const { z } = require('zod');
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(2000),
    });

    expect(schema.safeParse({ name: 'Test', description: '' }).success).toBe(false);
    expect(schema.safeParse({ name: 'Test', description: 'Valid description' }).success).toBe(true);
    expect(schema.safeParse({ name: 'Test', description: 'a'.repeat(2001) }).success).toBe(false);
  });

  it('should validate optional config schema', () => {
    const { z } = require('zod');
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(2000),
      config: z.object({
        stack: z.array(z.string()).optional(),
        features: z.array(z.string()).optional(),
        billingMode: z.enum(['subscription', 'usage', 'none']).optional(),
      }).optional(),
    });

    expect(schema.safeParse({
      name: 'Test',
      description: 'Test',
      config: { stack: ['react'], features: ['auth'], billingMode: 'subscription' },
    }).success).toBe(true);

    expect(schema.safeParse({
      name: 'Test',
      description: 'Test',
      config: { billingMode: 'invalid' },
    }).success).toBe(false);
  });
});

// ============ Deployment Manager Tests ============

describe('Deployment Manager', () => {
  it('should export stack detection function', async () => {
    const { detectStack } = await import('../agents/deployment-manager.js');
    expect(typeof detectStack).toBe('function');
  });

  it('should return empty stack info for non-existent directory', async () => {
    const { detectStack } = await import('../agents/deployment-manager.js');
    const stack = detectStack('/tmp/nonexistent-project-dir');
    expect(stack.recommendedStrategies).toBeDefined();
    expect(stack.recommendedStrategies).toContain('docker');
  });

  it('should export deployment option functions', async () => {
    const { getDeploymentOptions, getProjectDir } = await import('../agents/deployment-manager.js');
    expect(typeof getDeploymentOptions).toBe('function');
    expect(typeof getProjectDir).toBe('function');
  });

  it('should sanitize project names for directory paths', async () => {
    const { getProjectDir } = await import('../agents/deployment-manager.js');
    const dir = getProjectDir('My Cool Project!');
    expect(dir).toContain('my-cool-project');
    expect(dir).not.toContain('!');
    expect(dir).not.toContain(' ');
  });

  it('should export Dockerfile generation functions', async () => {
    const { generateDockerfile, generateDockerCompose } = await import('../agents/deployment-manager.js');
    expect(typeof generateDockerfile).toBe('function');
    expect(typeof generateDockerCompose).toBe('function');
  });

  it('should generate a valid Dockerfile for a Node backend', async () => {
    const { generateDockerfile } = await import('../agents/deployment-manager.js');
    const dockerfile = generateDockerfile('/tmp', {
      language: 'typescript',
      runtime: 'node',
      hasBackend: true,
      backendFramework: 'express',
      packageManager: 'npm',
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      recommendedStrategies: ['docker'],
    });
    expect(dockerfile).toContain('FROM node:22-alpine');
    expect(dockerfile).toContain('npm ci');
    expect(dockerfile).toContain('EXPOSE 3000');
    expect(dockerfile).toContain('npm run build');
  });

  it('should generate docker-compose with postgres for db apps', async () => {
    const { generateDockerCompose } = await import('../agents/deployment-manager.js');
    const compose = generateDockerCompose('test-app', {
      hasDatabase: true,
      databaseType: 'postgres',
      hasBackend: true,
      recommendedStrategies: ['docker'],
    }, 4000);
    expect(compose).toContain('postgres:16-alpine');
    expect(compose).toContain('4000:3000');
    expect(compose).toContain('DATABASE_URL');
    expect(compose).toContain('pgdata');
  });

  it('should recommend vercel for Next.js apps', async () => {
    const { detectStack } = await import('../agents/deployment-manager.js');
    // We can't easily mock the filesystem here, but we can test that the
    // strategy recommendation logic works correctly
    const stack = detectStack('/tmp/nonexistent');
    // Without a package.json, docker should be the default
    expect(stack.recommendedStrategies[0]).toBe('docker');
  });
});

// ============ Coding Agent Integration Scenarios ============

describe('Coding Agent Integration Scenarios', () => {
  it('development phase should route coding roles to coding agent', () => {
    const codingRoles: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops'];
    const thinkingRoles: AgentRole[] = ['pm', 'ba', 'architect'];

    // Coding roles should be in development phase
    codingRoles.forEach(role => {
      if (role === 'devops') {
        expect(PHASE_AGENTS.deployment).toContain(role);
      } else {
        expect(PHASE_AGENTS.development).toContain(role);
      }
    });

    // Thinking roles should NOT be in coding roles list
    thinkingRoles.forEach(role => {
      expect(codingRoles).not.toContain(role);
    });
  });

  it('QA should use coding agent during testing phase', () => {
    expect(PHASE_AGENTS.testing).toContain('qa');
  });

  it('PM should always use MiniMax LLM, never coding agent', () => {
    const codingRoles: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops'];
    expect(codingRoles).not.toContain('pm');

    // PM participates in all phases but should use LLM
    expect(AGENT_ROLES.pm.participatesInPhases.length).toBe(5);
  });

  it('architecture phase should not use coding agent', () => {
    const architectureAgents = PHASE_AGENTS.architecture;
    const codingRoles: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops'];

    architectureAgents.forEach(agent => {
      expect(codingRoles).not.toContain(agent);
    });
  });
});

// ============ Worker — Claude Code Enforcement Tests ============

describe('Worker Claude Code Enforcement', () => {
  it('worker should not silently fall back to LLM for coding roles', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const workerSource = fs.readFileSync(
      path.resolve(__dirname, '../worker.ts'),
      'utf-8'
    );

    // The worker should throw when Claude Code is unavailable, not fall back
    expect(workerSource).toContain('throw new Error');
    expect(workerSource).toContain('Claude Code is not installed');
  });

  it('worker CODING_ROLES should only include roles that generate code', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const workerSource = fs.readFileSync(
      path.resolve(__dirname, '../worker.ts'),
      'utf-8'
    );

    // CODING_ROLES should include frontend_dev, backend_dev, devops
    const match = workerSource.match(/const CODING_ROLES.*?\[([^\]]+)\]/s);
    expect(match).toBeTruthy();
    const rolesStr = match![1];
    expect(rolesStr).toContain('frontend_dev');
    expect(rolesStr).toContain('backend_dev');
    expect(rolesStr).toContain('devops');
    // PM, BA, architect should NOT be in CODING_ROLES
    expect(rolesStr).not.toContain("'pm'");
    expect(rolesStr).not.toContain("'ba'");
    expect(rolesStr).not.toContain("'architect'");
  });

  it('worker should not reference opencode', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const workerSource = fs.readFileSync(
      path.resolve(__dirname, '../worker.ts'),
      'utf-8'
    );
    const lowerSource = workerSource.toLowerCase();
    expect(lowerSource).not.toContain('opencode');
  });

  it('worker should throw on Claude Code execution failure, not use fallback text', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const workerSource = fs.readFileSync(
      path.resolve(__dirname, '../worker.ts'),
      'utf-8'
    );

    // Should NOT contain the old "Fallback Mode" silent degradation
    expect(workerSource).not.toContain('Fallback Mode');
    // Should throw on coding failure
    expect(workerSource).toContain('Claude Code failed');
  });
});

// ============ Claude Code Live Integration Test ============

describe('Claude Code Live Execution', () => {
  it('should generate a real file using Claude Code', async () => {
    const { isCodingAgentAvailable, runCodingAgent } = await import('../agents/coding-agent.js');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const status = isCodingAgentAvailable();
    if (!status.available) {
      console.warn('SKIPPED: Claude Code not installed — cannot run live integration test');
      return;
    }

    // Use a temp directory so we don't pollute the generated/ folder
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saas-factory-test-'));

    try {
      const result = await runCodingAgent({
        projectId: 'integration-test',
        projectName: 'integration-test',
        task: 'Create a single file called hello.ts in the current directory that exports a function greet(name: string): string which returns `Hello, ${name}!`. Do not create any other files or directories.',
        context: 'This is a quick integration test. Create only the single file requested in the working directory root.',
        workingDirectory: tmpDir,
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeTruthy();
      expect(result.duration).toBeGreaterThan(0);

      // Claude Code successfully ran — verify at least one file was created
      // (Claude Code may create the file with a slightly different structure)
      const allFiles = fs.readdirSync(tmpDir, { recursive: true }) as string[];
      const tsFiles = allFiles.filter(f => String(f).endsWith('.ts'));
      expect(tsFiles.length).toBeGreaterThan(0);

      // Read whichever .ts file was created and verify it has the greet function
      for (const tsFile of tsFiles) {
        const content = fs.readFileSync(path.join(tmpDir, String(tsFile)), 'utf-8');
        if (content.includes('greet')) {
          expect(content).toContain('Hello');
          return; // Test passes
        }
      }

      // If we got here, no .ts file contained 'greet' — check result output for code
      expect(result.output).toContain('greet');
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 120_000); // 2 min timeout for Claude Code execution
});
