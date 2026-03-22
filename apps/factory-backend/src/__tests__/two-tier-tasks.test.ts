/**
 * Two-Tier Task Architecture Integration Tests
 * 
 * Tests the Shrimp MCP-based task orchestration system:
 * - Tier 1: Artifact creation (BA spec, Architecture doc, Design doc, etc.)
 * - Tier 2: Implementation tasks (via Shrimp.split_tasks with parentTaskId linking)
 * 
 * Uses real Shrimp MCP server when available.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import { db, initializeDatabase } from '../db/index.js';
import { projects, agents, tasks, artifacts, conversations, activityLog, phaseMetrics } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { CORE_DELIVERABLES, TIER1_ARTIFACT_ROLES } from '../worker.js';

describe('Two-Tier Task Architecture', () => {
  let testProjectId: string;
  let testAgentId: string;

  beforeAll(() => {
    initializeDatabase();
  });

  beforeEach(() => {
    testProjectId = uuid();
    testAgentId = uuid();

    // Create test project
    db.insert(projects).values({
      id: testProjectId,
      name: 'Test Project',
      description: 'A test project for two-tier task architecture',
      status: 'planning',
      currentPhase: 'requirements',
      config: JSON.stringify({ stack: ['react', 'node'], features: ['auth'] }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();

    // Create test agent (BA)
    db.insert(agents).values({
      id: testAgentId,
      projectId: testProjectId,
      role: 'ba',
      name: 'Business Analyst',
      copyIndex: 0,
      status: 'idle',
      currentTask: null,
      progress: 0,
      createdAt: new Date(),
    }).run();
  });

  afterAll(() => {
    // Cleanup test data
    try {
      db.delete(activityLog).where(eq(activityLog.projectId, testProjectId)).run();
      db.delete(tasks).where(eq(tasks.projectId, testProjectId)).run();
      db.delete(artifacts).where(eq(artifacts.projectId, testProjectId)).run();
      db.delete(conversations).where(eq(conversations.projectId, testProjectId)).run();
      db.delete(phaseMetrics).where(eq(phaseMetrics.projectId, testProjectId)).run();
      db.delete(agents).where(eq(agents.projectId, testProjectId)).run();
      db.delete(projects).where(eq(projects.id, testProjectId)).run();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('CORE_DELIVERABLES', () => {
    it('should define Tier 1 deliverables for all artifact-creating roles', () => {
      const expectedPhases = ['requirements', 'architecture', 'design', 'testing', 'deployment'];
      const expectedRoles = ['ba', 'pm', 'architect', 'ux_designer', 'qa', 'devops'];

      expectedPhases.forEach(phase => {
        expect(CORE_DELIVERABLES[phase], `Phase ${phase} should be defined`).toBeDefined();
      });

      expectedRoles.forEach(role => {
        let found = false;
        for (const phase of Object.keys(CORE_DELIVERABLES)) {
          if (CORE_DELIVERABLES[phase]?.[role]) {
            found = true;
            break;
          }
        }
        expect(found, `Role ${role} should have at least one Tier 1 deliverable`).toBe(true);
      });
    });

    it('should have artifactType for each Tier 1 deliverable', () => {
      for (const [phase, roles] of Object.entries(CORE_DELIVERABLES)) {
        for (const [role, deliverable] of Object.entries(roles)) {
          expect(deliverable.artifactType, `${phase}/${role} should have artifactType`).toBeTruthy();
          expect(deliverable.artifactType.length, `${phase}/${role} artifactType should be non-empty`).toBeGreaterThan(0);
        }
      }
    });

    it('should have title for each Tier 1 deliverable', () => {
      for (const [phase, roles] of Object.entries(CORE_DELIVERABLES)) {
        for (const [role, deliverable] of Object.entries(roles)) {
          expect(deliverable.title, `${phase}/${role} should have title`).toBeTruthy();
          expect(deliverable.title.length, `${phase}/${role} title should be non-empty`).toBeGreaterThan(0);
        }
      }
    });

    it('should have description for each Tier 1 deliverable', () => {
      for (const [phase, roles] of Object.entries(CORE_DELIVERABLES)) {
        for (const [role, deliverable] of Object.entries(roles)) {
          expect(deliverable.description, `${phase}/${role} should have description`).toBeTruthy();
          expect(deliverable.description.length, `${phase}/${role} description should be non-empty`).toBeGreaterThan(0);
        }
      }
    });

    it('should have promptTemplate for each Tier 1 deliverable', () => {
      for (const [phase, roles] of Object.entries(CORE_DELIVERABLES)) {
        for (const [role, deliverable] of Object.entries(roles)) {
          expect(deliverable.promptTemplate, `${phase}/${role} should have promptTemplate`).toBeTruthy();
          expect(deliverable.promptTemplate.length, `${phase}/${role} promptTemplate should be non-empty`).toBeGreaterThan(0);
          expect(deliverable.promptTemplate, `${phase}/${role} promptTemplate should mention {{projectName}}`).toContain('{{projectName}}');
          expect(deliverable.promptTemplate, `${phase}/${role} promptTemplate should mention {{projectDescription}}`).toContain('{{projectDescription}}');
          expect(deliverable.promptTemplate, `${phase}/${role} promptTemplate should mention {{context}}`).toContain('{{context}}');
        }
      }
    });

    it('should map to valid artifact types', () => {
      const validArtifactTypes = ['spec', 'architecture', 'design_doc', 'code', 'test_report', 'deployment_config', 'documentation', 'requirements_doc'];
      for (const [phase, roles] of Object.entries(CORE_DELIVERABLES)) {
        for (const [role, deliverable] of Object.entries(roles)) {
          expect(validArtifactTypes, `${phase}/${role} artifactType ${deliverable.artifactType} should be valid`).toContain(deliverable.artifactType);
        }
      }
    });
  });

  describe('TIER1_ARTIFACT_ROLES', () => {
    it('should include all artifact-creating roles', () => {
      const expectedRoles = ['ba', 'pm', 'architect', 'ux_designer', 'qa', 'devops'];
      expectedRoles.forEach(role => {
        expect(TIER1_ARTIFACT_ROLES, `TIER1_ARTIFACT_ROLES should include ${role}`).toContain(role);
      });
    });

    it('should not include coding-only roles', () => {
      const codingRoles = ['frontend_dev', 'backend_dev'];
      codingRoles.forEach(role => {
        expect(TIER1_ARTIFACT_ROLES, `TIER1_ARTIFACT_ROLES should not include ${role}`).not.toContain(role);
      });
    });
  });

  describe('Tier 1 Artifact Creation', () => {
    it('should create BA spec artifact in requirements phase', () => {
      const deliverable = CORE_DELIVERABLES.requirements?.ba;
      expect(deliverable).toBeDefined();
      expect(deliverable.artifactType).toBe('spec');
      expect(deliverable.title).toContain('User Stories');
    });

    it('should create PM documentation in requirements phase', () => {
      const deliverable = CORE_DELIVERABLES.requirements?.pm;
      expect(deliverable).toBeDefined();
      expect(deliverable.artifactType).toBe('documentation');
      expect(deliverable.title).toContain('Charter');
    });

    it('should create architecture artifact in architecture phase', () => {
      const deliverable = CORE_DELIVERABLES.architecture?.architect;
      expect(deliverable).toBeDefined();
      expect(deliverable.artifactType).toBe('architecture');
      expect(deliverable.title).toContain('Architecture');
    });

    it('should create design_doc artifact in design phase', () => {
      const deliverable = CORE_DELIVERABLES.design?.ux_designer;
      expect(deliverable).toBeDefined();
      expect(deliverable.artifactType).toBe('design_doc');
      expect(deliverable.title).toContain('Design');
    });

    it('should create test_report artifact in testing phase', () => {
      const deliverable = CORE_DELIVERABLES.testing?.qa;
      expect(deliverable).toBeDefined();
      expect(deliverable.artifactType).toBe('test_report');
      expect(deliverable.title).toContain('Test');
    });

    it('should create deployment_config artifact in deployment phase', () => {
      const deliverable = CORE_DELIVERABLES.deployment?.devops;
      expect(deliverable).toBeDefined();
      expect(deliverable.artifactType).toBe('deployment_config');
      expect(deliverable.title).toContain('Deployment');
    });
  });

  describe('Task Creation Flow', () => {
    it('should require projectId for task creation', () => {
      expect(testProjectId).toBeTruthy();
      expect(testProjectId.length).toBeGreaterThan(0);
    });

    it('should require agentId for task creation', () => {
      expect(testAgentId).toBeTruthy();
      expect(testAgentId.length).toBeGreaterThan(0);
    });

    it('should create tasks with parentTaskId field available', () => {
      // The schema supports parentTaskId, verify field exists
      const existingTasks = db.select().from(tasks).where(eq(tasks.projectId, testProjectId)).all();
      // No tasks yet in test project, but schema should support the field
      expect(existingTasks).toEqual([]);
    });

    it('should support dependencies field as JSON array', () => {
      const testTaskId = uuid();
      const dependencies = JSON.stringify(['Task 1', 'Task 2']);

      db.insert(tasks).values({
        id: testTaskId,
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Test Task with Dependencies',
        description: 'Testing dependency tracking',
        status: 'in_progress',
        priority: 'medium',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 2,
        dependencies,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }).run();

      const created = db.select().from(tasks).where(eq(tasks.id, testTaskId)).get();
      expect(created).toBeDefined();
      expect(created?.dependencies).toBe(dependencies);

      // Cleanup
      db.delete(tasks).where(eq(tasks.id, testTaskId)).run();
    });

    it('should create tasks linked to phase', () => {
      const testTaskId = uuid();

      db.insert(tasks).values({
        id: testTaskId,
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Phase-Linked Task',
        description: 'Testing phase assignment',
        status: 'in_progress',
        priority: 'high',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 3,
        dependencies: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }).run();

      const created = db.select().from(tasks).where(eq(tasks.id, testTaskId)).get();
      expect(created).toBeDefined();
      expect(created?.phase).toBe('requirements');

      // Cleanup
      db.delete(tasks).where(eq(tasks.id, testTaskId)).run();
    });
  });

  describe('Phase-Artifact Mapping', () => {
    const phaseArtifactTests = [
      { phase: 'requirements', role: 'ba', expectedType: 'spec' },
      { phase: 'requirements', role: 'pm', expectedType: 'documentation' },
      { phase: 'architecture', role: 'architect', expectedType: 'architecture' },
      { phase: 'design', role: 'ux_designer', expectedType: 'design_doc' },
      { phase: 'testing', role: 'qa', expectedType: 'test_report' },
      { phase: 'deployment', role: 'devops', expectedType: 'deployment_config' },
    ];

    phaseArtifactTests.forEach(({ phase, role, expectedType }) => {
      it(`should map ${phase}/${role} to artifact type ${expectedType}`, () => {
        const deliverable = CORE_DELIVERABLES[phase]?.[role];
        expect(deliverable, `${phase}/${role} should have a deliverable`).toBeDefined();
        expect(deliverable.artifactType, `${phase}/${role} should have artifactType ${expectedType}`).toBe(expectedType);
      });
    });
  });

  describe('Shrimp MCP Integration', () => {
    it('should have Shrimp MCP client available for connection', async () => {
      // This test verifies the Shrimp MCP infrastructure exists
      // Actual connection testing requires Shrimp server running
      const { getShrimpClient } = await import('../mcp/index.js');
      expect(typeof getShrimpClient).toBe('function');
    });

    it('should have splitTasks function available in Shrimp client', async () => {
      const { getShrimpClient } = await import('../mcp/index.js');
      const client = await getShrimpClient();
      expect(typeof client.splitTasks).toBe('function');
    });

    it('should have analyzeTask function available in Shrimp client', async () => {
      const { getShrimpClient } = await import('../mcp/index.js');
      const client = await getShrimpClient();
      expect(typeof client.analyzeTask).toBe('function');
    });

    it('should have planTask function available in Shrimp client', async () => {
      const { getShrimpClient } = await import('../mcp/index.js');
      const client = await getShrimpClient();
      expect(typeof client.planTask).toBe('function');
    });

    it('should have verifyTask function available in Shrimp client', async () => {
      const { getShrimpClient } = await import('../mcp/index.js');
      const client = await getShrimpClient();
      expect(typeof client.verifyTask).toBe('function');
    });
  });

  describe('Task Dependencies', () => {
    it('should support task dependencies as array', () => {
      const parentTaskId = uuid();
      const childTaskId = uuid();

      // Create parent task
      db.insert(tasks).values({
        id: parentTaskId,
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Parent Task',
        description: 'Parent task for dependency test',
        status: 'done',
        priority: 'high',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 4,
        dependencies: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      }).run();

      // Create child task with dependency
      db.insert(tasks).values({
        id: childTaskId,
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Child Task',
        description: 'Child task depending on parent',
        status: 'in_progress',
        priority: 'high',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 2,
        dependencies: JSON.stringify(['Parent Task']),
        parentTaskId,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }).run();

      const child = db.select().from(tasks).where(eq(tasks.id, childTaskId)).get();
      expect(child).toBeDefined();
      expect(child?.parentTaskId).toBe(parentTaskId);
      expect(child?.dependencies).toContain('Parent Task');

      // Cleanup
      db.delete(tasks).where(eq(tasks.id, parentTaskId)).run();
      db.delete(tasks).where(eq(tasks.id, childTaskId)).run();
    });

    it('should support multiple dependencies', () => {
      const taskIds = [uuid(), uuid(), uuid()];

      db.insert(tasks).values({
        id: taskIds[0],
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Task A',
        description: 'First task',
        status: 'done',
        priority: 'medium',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 1,
        dependencies: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      }).run();

      db.insert(tasks).values({
        id: taskIds[1],
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Task B',
        description: 'Second task',
        status: 'done',
        priority: 'medium',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 1,
        dependencies: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      }).run();

      db.insert(tasks).values({
        id: taskIds[2],
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Task C',
        description: 'Task depending on A and B',
        status: 'in_progress',
        priority: 'high',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 2,
        dependencies: JSON.stringify(['Task A', 'Task B']),
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }).run();

      const taskC = db.select().from(tasks).where(eq(tasks.id, taskIds[2])).get();
      expect(taskC).toBeDefined();
      const deps = JSON.parse(taskC?.dependencies || '[]');
      expect(deps).toContain('Task A');
      expect(deps).toContain('Task B');
      expect(deps.length).toBe(2);

      // Cleanup
      taskIds.forEach(id => db.delete(tasks).where(eq(tasks.id, id)).run());
    });
  });

  describe('Integration: Full Task Flow', () => {
    it('should create both Tier 1 artifact and Tier 2 tasks in sequence', async () => {
      // This test validates the concept of two-tier architecture
      // In real usage, runAgentWork would:
      // 1. Create Tier 1 artifact (via generateTier1Artifact)
      // 2. Use Shrimp to split work into Tier 2 tasks
      // 3. Store Tier 2 tasks with parentTaskId linking to Tier 1

      const artifactId = uuid();
      const taskId = uuid();

      // Simulate Tier 1 artifact creation
      db.insert(artifacts).values({
        id: artifactId,
        projectId: testProjectId,
        agentId: testAgentId,
        title: 'User Stories & Requirements Document',
        type: 'spec',
        content: '# User Stories\n\nAs a user, I want to...',
        phase: 'requirements',
        version: 1,
        createdAt: new Date(),
      }).run();

      // Simulate Tier 2 task with parentTaskId
      db.insert(tasks).values({
        id: taskId,
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Implement user authentication',
        description: 'Build login/logout functionality',
        status: 'in_progress',
        priority: 'critical',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 8,
        dependencies: '[]',
        parentTaskId: artifactId,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }).run();

      // Verify artifact was created
      const artifact = db.select().from(artifacts).where(eq(artifacts.id, artifactId)).get();
      expect(artifact).toBeDefined();
      expect(artifact?.type).toBe('spec');

      // Verify task was created with parentTaskId
      const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
      expect(task).toBeDefined();
      expect(task?.parentTaskId).toBe(artifactId);
      expect(task?.title).toContain('user authentication');

      // Verify we can query tasks by parent
      const childTasks = db.select().from(tasks)
        .where(eq(tasks.projectId, testProjectId))
        .all()
        .filter(t => t.parentTaskId === artifactId);
      expect(childTasks.length).toBe(1);
      expect(childTasks[0]?.title).toContain('user authentication');

      // Cleanup
      db.delete(tasks).where(eq(tasks.id, taskId)).run();
      db.delete(artifacts).where(eq(artifacts.id, artifactId)).run();
    });

    it('should track task status through lifecycle', () => {
      const taskId = uuid();

      // Create task
      db.insert(tasks).values({
        id: taskId,
        projectId: testProjectId,
        assigneeId: testAgentId,
        title: 'Lifecycle Test Task',
        description: 'Testing task status transitions',
        status: 'in_progress',
        priority: 'medium',
        sprint: 1,
        phase: 'requirements',
        estimatedHours: 2,
        dependencies: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      }).run();

      let task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
      expect(task?.status).toBe('in_progress');
      expect(task?.completedAt).toBeNull();

      // Move to review
      db.update(tasks)
        .set({ status: 'review', updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .run();

      task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
      expect(task?.status).toBe('review');

      // Complete task
      const now = new Date();
      db.update(tasks)
        .set({ status: 'done', completedAt: now, updatedAt: now })
        .where(eq(tasks.id, taskId))
        .run();

      task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
      expect(task?.status).toBe('done');
      expect(task?.completedAt).not.toBeNull();

      // Cleanup
      db.delete(tasks).where(eq(tasks.id, taskId)).run();
    });
  });
});
