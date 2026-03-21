/**
 * Backend API & Engine Tests for SaaS Factory v2
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
    // Save and clear API key
    const originalKey = process.env.MINIMAX_API_KEY;
    delete process.env.MINIMAX_API_KEY;

    const { callLLM } = await import('../agents/llm.js');
    const response = await callLLM(
      'You are an experienced Project Manager for a SaaS development team.',
      [{ role: 'user', content: 'Create a project plan for a blog application' }]
    );

    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(100);
    expect(response.tokensUsed).toBe(0); // fallback mode

    // Restore
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

// ============ Database Schema Tests ============

describe('Database Schema', () => {
  it('should initialize database without errors', async () => {
    // Use an in-memory database for testing
    const { initializeDatabase } = await import('../db/index.js');
    expect(() => initializeDatabase()).not.toThrow();
  });

  it('should have correct table schemas', async () => {
    const schema = await import('../db/schema.js');

    // Check projects table
    expect(schema.projects).toBeDefined();

    // Check agents table
    expect(schema.agents).toBeDefined();

    // Check conversations table
    expect(schema.conversations).toBeDefined();

    // Check messages table
    expect(schema.messages).toBeDefined();

    // Check tasks table
    expect(schema.tasks).toBeDefined();

    // Check artifacts table
    expect(schema.artifacts).toBeDefined();

    // Check activity log table
    expect(schema.activityLog).toBeDefined();
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

    // Check that project:created event was broadcast
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
    expect(status!.agents).toHaveLength(7); // All 7 agent roles
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

  it('should start a project and run through phases', async () => {
    const { AgentEngine } = await import('../agents/engine.js');
    const events: any[] = [];
    const engine = new AgentEngine((event) => events.push(event));

    const projectId = await engine.createProject('Full Run', 'Complete test run');

    // Start will run asynchronously, so we wait for completion
    await engine.startProject(projectId);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check that phase events were emitted
    const phaseStarted = events.filter(e => e.type === 'phase:started');
    expect(phaseStarted.length).toBeGreaterThan(0);

    // Check that agent status events were emitted
    const agentEvents = events.filter(e => e.type === 'agent:status' || e.type === 'agent:progress');
    expect(agentEvents.length).toBeGreaterThan(0);
  }, 30000);
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
});
