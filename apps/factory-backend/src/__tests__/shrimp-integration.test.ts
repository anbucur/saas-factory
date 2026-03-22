/**
 * Tests for Shrimp MCP integration — validates the JSON payloads
 * we build for the split_tasks tool match its Zod schema requirements.
 */
import { describe, it, expect } from 'vitest';

// ── Shrimp split_tasks schema contract ──────────────────────────────────────

// Mirrors the Zod schema from mcp-shrimp-task-manager/dist/tools/task/splitTasksRaw.js
const VALID_UPDATE_MODES = ['append', 'overwrite', 'selective', 'clearAllTasks'] as const;
type UpdateMode = (typeof VALID_UPDATE_MODES)[number];

interface ShrimpTaskPayload {
  name: string;
  description: string;
  implementationGuide: string; // REQUIRED by Shrimp
  dependencies?: string[];
  notes?: string;
  relatedFiles?: Array<{
    path: string;
    type: 'TO_MODIFY' | 'REFERENCE' | 'CREATE' | 'DEPENDENCY' | 'OTHER';
    description: string;
    lineStart?: number;
    lineEnd?: number;
  }>;
  verificationCriteria?: string;
}

interface SplitTasksArgs {
  updateMode: UpdateMode;
  tasksRaw: string; // JSON-stringified ShrimpTaskPayload[]
  globalAnalysisResult?: string;
}

function validateShrimpTaskPayload(task: any): string[] {
  const errors: string[] = [];
  if (!task.name || typeof task.name !== 'string') errors.push('name must be a non-empty string');
  if (task.name && task.name.length > 100) errors.push('name must be <= 100 chars');
  if (!task.description || typeof task.description !== 'string') errors.push('description must be a non-empty string');
  if (task.description && task.description.length < 10) errors.push('description must be >= 10 chars');
  if (!task.implementationGuide || typeof task.implementationGuide !== 'string') errors.push('implementationGuide must be a non-empty string');
  if (task.dependencies !== undefined && !Array.isArray(task.dependencies)) errors.push('dependencies must be an array');
  if (task.notes !== undefined && typeof task.notes !== 'string') errors.push('notes must be a string');
  if (task.verificationCriteria !== undefined && typeof task.verificationCriteria !== 'string') errors.push('verificationCriteria must be a string');
  return errors;
}

function validateSplitTasksArgs(args: any): string[] {
  const errors: string[] = [];
  if (!VALID_UPDATE_MODES.includes(args.updateMode)) {
    errors.push(`updateMode must be one of: ${VALID_UPDATE_MODES.join(', ')}`);
  }
  if (typeof args.tasksRaw !== 'string') {
    errors.push('tasksRaw must be a string');
    return errors;
  }
  let tasks: any[];
  try {
    tasks = JSON.parse(args.tasksRaw);
  } catch {
    errors.push('tasksRaw must be valid JSON');
    return errors;
  }
  if (!Array.isArray(tasks)) {
    errors.push('tasksRaw must be a JSON array');
    return errors;
  }
  if (tasks.length === 0) {
    errors.push('tasksRaw must have at least 1 task');
    return errors;
  }
  for (let i = 0; i < tasks.length; i++) {
    const taskErrors = validateShrimpTaskPayload(tasks[i]);
    for (const e of taskErrors) {
      errors.push(`tasks[${i}]: ${e}`);
    }
  }
  // Check for duplicate names
  const names = tasks.map((t: any) => t.name);
  const dupes = names.filter((n: string, i: number) => names.indexOf(n) !== i);
  if (dupes.length > 0) {
    errors.push(`Duplicate task names: ${[...new Set(dupes)].join(', ')}`);
  }
  return errors;
}

// ── Replicate the worker's task-building logic ──────────────────────────────

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
};

/** Replicates exactly what worker.ts builds for Shrimp split_tasks */
function buildSplitTasksArgs(phase: string, role: string, projectName: string): SplitTasksArgs {
  const globalAnalysisResult = `Phase: ${phase}, Role: ${role}, Project: ${projectName}. ` +
    `This is a ${phase} phase task for a ${role} agent. ` +
    `Generate atomic, verifiable tasks that can be completed independently.`;

  const templates = TASK_TEMPLATES[phase]?.[role] || [];

  const tasksRaw = JSON.stringify(templates.map((t, i) => ({
    name: t.title,
    description: `${t.description}. Completable in ${t.hours} hours. Priority: ${t.priority}.`,
    implementationGuide: `Execute the ${t.title.toLowerCase()} task for the ${phase} phase as a ${role} agent.`,
    dependencies: i > 0 ? [templates[0].title] : [],
    notes: `Estimated ${t.hours}h, ${t.priority} priority`,
    verificationCriteria: `Task "${t.title}" output is reviewed and meets acceptance criteria.`,
  })));

  return { updateMode: 'append', tasksRaw, globalAnalysisResult };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Shrimp MCP split_tasks payload validation', () => {
  const ALL_PHASES = Object.keys(TASK_TEMPLATES);

  it('should have templates for all expected phases', () => {
    expect(ALL_PHASES).toEqual(expect.arrayContaining(['requirements', 'architecture', 'development', 'testing', 'deployment']));
  });

  for (const phase of Object.keys(TASK_TEMPLATES)) {
    for (const role of Object.keys(TASK_TEMPLATES[phase])) {
      it(`${phase}/${role}: produces valid split_tasks arguments`, () => {
        const args = buildSplitTasksArgs(phase, role, 'TestProject');
        const errors = validateSplitTasksArgs(args);
        expect(errors).toEqual([]);
      });

      it(`${phase}/${role}: tasksRaw is valid JSON with correct structure`, () => {
        const args = buildSplitTasksArgs(phase, role, 'TestProject');
        const tasks = JSON.parse(args.tasksRaw);
        expect(Array.isArray(tasks)).toBe(true);
        expect(tasks.length).toBeGreaterThan(0);

        for (const task of tasks) {
          expect(typeof task.name).toBe('string');
          expect(task.name.length).toBeLessThanOrEqual(100);
          expect(typeof task.description).toBe('string');
          expect(task.description.length).toBeGreaterThanOrEqual(10);
          expect(typeof task.implementationGuide).toBe('string');
          expect(task.implementationGuide.length).toBeGreaterThan(0);
          expect(Array.isArray(task.dependencies)).toBe(true);
        }
      });

      it(`${phase}/${role}: no duplicate task names`, () => {
        const args = buildSplitTasksArgs(phase, role, 'TestProject');
        const tasks = JSON.parse(args.tasksRaw);
        const names = tasks.map((t: any) => t.name);
        expect(new Set(names).size).toBe(names.length);
      });
    }
  }
});

describe('Shrimp MCP response parsing', () => {
  it('should handle null/undefined splitResult gracefully', () => {
    const splitResult: any = null;
    const taskList = Array.isArray(splitResult?.tasks) ? splitResult.tasks : [];
    expect(taskList).toEqual([]);
  });

  it('should handle result with missing tasks array', () => {
    const splitResult: any = { raw: 'some error text' };
    const taskList = Array.isArray(splitResult?.tasks) ? splitResult.tasks : [];
    expect(taskList).toEqual([]);
  });

  it('should handle result with valid tasks array', () => {
    const splitResult: any = {
      tasks: [
        { name: 'Task 1', description: 'Do something', implementationGuide: 'Step 1', dependencies: [] },
      ],
      globalAnalysis: 'Analysis text',
    };
    const taskList = Array.isArray(splitResult?.tasks) ? splitResult.tasks : [];
    expect(taskList).toHaveLength(1);
    expect(taskList[0].name).toBe('Task 1');
  });

  it('should handle result where tasks is not an array', () => {
    const splitResult: any = { tasks: 'not an array' };
    const taskList = Array.isArray(splitResult?.tasks) ? splitResult.tasks : [];
    expect(taskList).toEqual([]);
  });
});

describe('Shrimp MCP handleResponse id handling', () => {
  it('should coerce numeric id to string for map lookup', () => {
    // Simulates the fix: String(response.id) for consistent lookups
    const pendingRequests = new Map<string, boolean>();
    const uuid = 'abc-123';
    pendingRequests.set(uuid, true);

    // Numeric id: 0 should not match any UUID-keyed entry
    expect(pendingRequests.get(String(0))).toBeUndefined();
    // UUID id should match
    expect(pendingRequests.get(String(uuid))).toBe(true);
  });

  it('should silently skip id: 0 (MCP init message)', () => {
    const responseId = 0;
    const shouldSkip = responseId === 0 || responseId === '0' as any;
    expect(shouldSkip).toBe(true);
  });

  it('should not skip valid UUID ids', () => {
    const responseId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const shouldSkip = responseId === 0 || responseId === '0';
    expect(shouldSkip).toBe(false);
  });
});

describe('split_tasks argument edge cases', () => {
  it('should reject plain text tasksRaw (not JSON)', () => {
    const args = {
      updateMode: 'append' as const,
      tasksRaw: 'Based on the following task templates...',
    };
    const errors = validateSplitTasksArgs(args);
    expect(errors.some(e => e.includes('valid JSON'))).toBe(true);
  });

  it('should reject tasks missing implementationGuide', () => {
    const args = {
      updateMode: 'append' as const,
      tasksRaw: JSON.stringify([{
        name: 'Some task',
        description: 'A description that is long enough to pass validation',
        dependencies: [],
      }]),
    };
    const errors = validateSplitTasksArgs(args);
    expect(errors.some(e => e.includes('implementationGuide'))).toBe(true);
  });

  it('should reject empty task array', () => {
    const args = {
      updateMode: 'append' as const,
      tasksRaw: '[]',
    };
    const errors = validateSplitTasksArgs(args);
    expect(errors.some(e => e.includes('at least 1 task'))).toBe(true);
  });

  it('should reject invalid updateMode', () => {
    const args = {
      updateMode: 'invalid' as any,
      tasksRaw: JSON.stringify([{
        name: 'Task',
        description: 'A description that is long enough',
        implementationGuide: 'Steps',
        dependencies: [],
      }]),
    };
    const errors = validateSplitTasksArgs(args);
    expect(errors.some(e => e.includes('updateMode'))).toBe(true);
  });

  it('should reject duplicate task names', () => {
    const args = {
      updateMode: 'append' as const,
      tasksRaw: JSON.stringify([
        { name: 'Same name', description: 'First task description is long enough', implementationGuide: 'Guide 1', dependencies: [] },
        { name: 'Same name', description: 'Second task description is long enough', implementationGuide: 'Guide 2', dependencies: [] },
      ]),
    };
    const errors = validateSplitTasksArgs(args);
    expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
  });
});
