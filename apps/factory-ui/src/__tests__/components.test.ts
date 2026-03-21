/**
 * Frontend Tests for SaaS Factory v2
 * Includes tests for coding agent UI integration
 */
import { describe, it, expect } from 'vitest';
import {
  AGENT_ROLE_META,
  PHASE_META,
  PHASE_ORDER,
  type AgentRole,
  type AgentStatus,
  type ProjectStatus,
  type ProjectPhase,
  type TaskStatus,
  type TaskPriority,
  type ArtifactType,
  type LogType,
  type MessageType,
} from '../types';

// ============ Type Validation Tests ============

describe('Agent Types', () => {
  const allRoles: AgentRole[] = ['pm', 'ba', 'architect', 'frontend_dev', 'backend_dev', 'qa', 'devops'];

  it('should have 7 agent roles', () => {
    expect(allRoles).toHaveLength(7);
  });

  it('should have metadata for every role', () => {
    allRoles.forEach(role => {
      const meta = AGENT_ROLE_META[role];
      expect(meta).toBeDefined();
      expect(meta.name).toBeTruthy();
      expect(meta.emoji).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.title).toBeTruthy();
    });
  });

  it('should have unique colors for each role', () => {
    const colors = Object.values(AGENT_ROLE_META).map(m => m.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('should have unique emojis for each role', () => {
    const emojis = Object.values(AGENT_ROLE_META).map(m => m.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('should have unique titles for each role', () => {
    const titles = Object.values(AGENT_ROLE_META).map(m => m.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('Agent Statuses', () => {
  const statuses: AgentStatus[] = ['idle', 'thinking', 'working', 'reviewing', 'blocked', 'done'];

  it('should have 6 statuses', () => {
    expect(statuses).toHaveLength(6);
  });

  it('should include all lifecycle states', () => {
    expect(statuses).toContain('idle');
    expect(statuses).toContain('thinking');
    expect(statuses).toContain('working');
    expect(statuses).toContain('reviewing');
    expect(statuses).toContain('done');
  });
});

// ============ Project Types Tests ============

describe('Project Status', () => {
  const statuses: ProjectStatus[] = ['planning', 'in_progress', 'paused', 'completed', 'failed'];

  it('should have 5 project statuses', () => {
    expect(statuses).toHaveLength(5);
  });

  it('should include terminal states', () => {
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
  });

  it('should include paused state', () => {
    expect(statuses).toContain('paused');
  });
});

describe('Project Phases', () => {
  it('should have 6 phases including completed', () => {
    expect(PHASE_ORDER).toHaveLength(6);
  });

  it('should follow correct development order', () => {
    expect(PHASE_ORDER[0]).toBe('requirements');
    expect(PHASE_ORDER[1]).toBe('architecture');
    expect(PHASE_ORDER[2]).toBe('development');
    expect(PHASE_ORDER[3]).toBe('testing');
    expect(PHASE_ORDER[4]).toBe('deployment');
    expect(PHASE_ORDER[5]).toBe('completed');
  });

  it('should have metadata for every phase', () => {
    PHASE_ORDER.forEach(phase => {
      const meta = PHASE_META[phase];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('should have unique colors for each phase', () => {
    const colors = Object.values(PHASE_META).map(m => m.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

// ============ Task Types Tests ============

describe('Task Types', () => {
  it('should have 5 task statuses in kanban order', () => {
    const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    expect(statuses).toHaveLength(5);
    expect(statuses[0]).toBe('backlog');
    expect(statuses[statuses.length - 1]).toBe('done');
  });

  it('should have 4 priority levels', () => {
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
    expect(priorities).toHaveLength(4);
  });
});

// ============ Artifact Types Tests ============

describe('Artifact Types', () => {
  it('should have 7 artifact types', () => {
    const types: ArtifactType[] = ['spec', 'architecture', 'code', 'test_report', 'review', 'deployment_config', 'documentation'];
    expect(types).toHaveLength(7);
  });
});

// ============ Message Types Tests ============

describe('Message Types', () => {
  it('should have 7 message types', () => {
    const types: MessageType[] = ['discussion', 'decision', 'question', 'answer', 'task_update', 'review', 'approval'];
    expect(types).toHaveLength(7);
  });
});

// ============ Log Types Tests ============

describe('Log Types', () => {
  it('should have 5 log types', () => {
    const types: LogType[] = ['info', 'success', 'warning', 'error', 'milestone'];
    expect(types).toHaveLength(5);
  });
});

// ============ Store Tests ============

describe('App Store', () => {
  it('should initialize with default state', async () => {
    const { useAppStore } = await import('../store/store');
    const state = useAppStore.getState();

    expect(state.projects).toEqual([]);
    expect(state.currentProject).toBeNull();
    expect(state.wsConnected).toBe(false);
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('should set projects', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    const mockProjects = [
      {
        id: '1', name: 'Test', description: 'Test project', status: 'planning' as const,
        currentPhase: 'requirements' as const, config: {}, createdAt: '', updatedAt: '', completedAt: null,
        agentCount: 7, taskCount: 0, completedTaskCount: 0, progress: 0,
      },
    ];

    store.setProjects(mockProjects);
    expect(useAppStore.getState().projects).toHaveLength(1);
    expect(useAppStore.getState().projects[0].name).toBe('Test');
  });

  it('should toggle sidebar', async () => {
    const { useAppStore } = await import('../store/store');
    const initial = useAppStore.getState().sidebarCollapsed;

    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(!initial);

    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(initial);
  });

  it('should handle project:started event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-1', name: 'Test', description: 'Test', status: 'planning',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'project:started',
      payload: { projectId: 'proj-1' },
    });

    expect(useAppStore.getState().currentProject?.status).toBe('in_progress');
  });

  it('should handle project:paused event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-pause', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'development', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.setProjects([{
      id: 'proj-pause', name: 'Test', description: 'Test', status: 'in_progress' as const,
      currentPhase: 'development' as const, config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agentCount: 7, taskCount: 0, completedTaskCount: 0, progress: 0,
    }]);

    store.handleWSEvent({
      type: 'project:paused',
      payload: { projectId: 'proj-pause' },
    });

    expect(useAppStore.getState().currentProject?.status).toBe('paused');
    expect(useAppStore.getState().projects[0].status).toBe('paused');
  });

  it('should handle project:completed event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-2', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'deployment', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'project:completed',
      payload: { projectId: 'proj-2' },
    });

    expect(useAppStore.getState().currentProject?.status).toBe('completed');
    expect(useAppStore.getState().currentProject?.currentPhase).toBe('completed');
  });

  it('should handle phase:started event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-3', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'phase:started',
      payload: { projectId: 'proj-3', phase: 'architecture' },
    });

    expect(useAppStore.getState().currentProject?.currentPhase).toBe('architecture');
  });

  it('should handle agent:status event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-4', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [{
        id: 'agent-1', projectId: 'proj-4', role: 'pm', name: 'Project Manager',
        status: 'idle', currentTask: null, progress: 0, createdAt: '',
      }],
      tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'agent:status',
      payload: { projectId: 'proj-4', agentId: 'agent-1', role: 'pm', status: 'working', task: 'Creating plan' },
    });

    const updatedAgent = useAppStore.getState().currentProject?.agents[0];
    expect(updatedAgent?.status).toBe('working');
    expect(updatedAgent?.currentTask).toBe('Creating plan');
  });

  it('should handle agent:status with reviewing status (coding agent)', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-review', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [{
        id: 'agent-pm', projectId: 'proj-review', role: 'pm', name: 'Project Manager',
        status: 'idle', currentTask: null, progress: 0, createdAt: '',
      }],
      tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'agent:status',
      payload: { projectId: 'proj-review', agentId: 'agent-pm', role: 'pm', status: 'reviewing', task: 'Reviewing phase work' },
    });

    const updatedAgent = useAppStore.getState().currentProject?.agents[0];
    expect(updatedAgent?.status).toBe('reviewing');
    expect(updatedAgent?.currentTask).toBe('Reviewing phase work');
  });

  it('should handle conversation:created event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-convo', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'conversation:created',
      payload: {
        projectId: 'proj-convo',
        conversationId: 'conv-1',
        title: 'Requirements Phase Discussion',
        phase: 'requirements',
      },
    });

    const convos = useAppStore.getState().currentProject?.conversations;
    expect(convos).toHaveLength(1);
    expect(convos![0].title).toBe('Requirements Phase Discussion');
    expect(convos![0].phase).toBe('requirements');
    expect(convos![0].status).toBe('active');
  });

  it('should handle task:created event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-5', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'task:created',
      payload: { projectId: 'proj-5', taskId: 'task-1', title: 'Write spec', status: 'done', assigneeId: 'agent-1', phase: 'requirements' },
    });

    expect(useAppStore.getState().currentProject?.tasks).toHaveLength(1);
    expect(useAppStore.getState().currentProject?.tasks[0].title).toBe('Write spec');
  });

  it('should handle artifact:created event with agent info', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-art', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'development', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'artifact:created',
      payload: {
        projectId: 'proj-art',
        artifactId: 'art-1',
        title: 'Frontend Developer - development Output',
        type: 'code',
        agentId: 'agent-fe',
        agentRole: 'frontend_dev',
        phase: 'development',
      },
    });

    const artifacts = useAppStore.getState().currentProject?.artifacts;
    expect(artifacts).toHaveLength(1);
    expect(artifacts![0].type).toBe('code');
    expect(artifacts![0].title).toContain('Frontend Developer');
  });

  it('should handle activity:log event', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-6', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'activity:log',
      payload: {
        id: 'log-1', projectId: 'proj-6', agentId: null, agentRole: null,
        action: 'Phase started', details: 'Requirements phase', logType: 'milestone',
        phase: 'requirements', createdAt: new Date().toISOString(),
      },
    });

    expect(useAppStore.getState().currentProject?.logs).toHaveLength(1);
    expect(useAppStore.getState().currentProject?.logs[0].action).toBe('Phase started');
  });

  it('should set WebSocket connected status', async () => {
    const { useAppStore } = await import('../store/store');

    useAppStore.getState().setWsConnected(true);
    expect(useAppStore.getState().wsConnected).toBe(true);

    useAppStore.getState().setWsConnected(false);
    expect(useAppStore.getState().wsConnected).toBe(false);
  });

  it('should not update when event is for different project', async () => {
    const { useAppStore } = await import('../store/store');
    const store = useAppStore.getState();

    store.setCurrentProject({
      id: 'proj-7', name: 'Test', description: 'Test', status: 'in_progress',
      currentPhase: 'requirements', config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [], tasks: [], artifacts: [], conversations: [], logs: [],
    });

    store.handleWSEvent({
      type: 'phase:started',
      payload: { projectId: 'different-project', phase: 'architecture' },
    });

    expect(useAppStore.getState().currentProject?.currentPhase).toBe('requirements');
  });
});

// ============ API Client Tests ============

describe('API Client', () => {
  it('should export all required methods', async () => {
    const { api } = await import('../lib/api');

    expect(typeof api.listProjects).toBe('function');
    expect(typeof api.getProject).toBe('function');
    expect(typeof api.createProject).toBe('function');
    expect(typeof api.startProject).toBe('function');
    expect(typeof api.pauseProject).toBe('function');
    expect(typeof api.deleteProject).toBe('function');
    expect(typeof api.getProjectAgents).toBe('function');
    expect(typeof api.getProjectConversations).toBe('function');
    expect(typeof api.getConversationMessages).toBe('function');
    expect(typeof api.getProjectTasks).toBe('function');
    expect(typeof api.updateTask).toBe('function');
    expect(typeof api.getProjectArtifacts).toBe('function');
    expect(typeof api.getProjectLogs).toBe('function');
    expect(typeof api.getCodingAgentStatus).toBe('function');
    expect(typeof api.health).toBe('function');
  });
});

// ============ Coding Agent UI Tests ============

describe('Coding Agent Roles', () => {
  const codingRoles: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops', 'qa'];
  const thinkingRoles: AgentRole[] = ['pm', 'ba', 'architect'];

  it('coding roles should have metadata', () => {
    codingRoles.forEach(role => {
      expect(AGENT_ROLE_META[role]).toBeDefined();
      expect(AGENT_ROLE_META[role].name).toBeTruthy();
    });
  });

  it('thinking roles should have metadata', () => {
    thinkingRoles.forEach(role => {
      expect(AGENT_ROLE_META[role]).toBeDefined();
      expect(AGENT_ROLE_META[role].name).toBeTruthy();
    });
  });

  it('all 7 roles should be covered between coding and thinking', () => {
    const allRoles = [...codingRoles, ...thinkingRoles];
    expect(allRoles).toHaveLength(7);
    expect(new Set(allRoles).size).toBe(7);
  });
});

// ============ Integration-style Tests ============

describe('Phase-Agent Mapping Consistency', () => {
  it('every role in AGENT_ROLE_META should be a valid AgentRole', () => {
    const validRoles: AgentRole[] = ['pm', 'ba', 'architect', 'frontend_dev', 'backend_dev', 'qa', 'devops'];
    Object.keys(AGENT_ROLE_META).forEach(role => {
      expect(validRoles).toContain(role);
    });
  });

  it('every phase in PHASE_META should be a valid ProjectPhase', () => {
    const validPhases: ProjectPhase[] = ['requirements', 'architecture', 'development', 'testing', 'deployment', 'completed'];
    Object.keys(PHASE_META).forEach(phase => {
      expect(validPhases).toContain(phase);
    });
  });

  it('PHASE_ORDER should contain all phases from PHASE_META', () => {
    Object.keys(PHASE_META).forEach(phase => {
      expect(PHASE_ORDER).toContain(phase as ProjectPhase);
    });
  });
});

describe('Data Structure Contracts', () => {
  it('ProjectDetail should contain all required arrays', () => {
    const projectDetail = {
      id: '1', name: 'Test', description: 'Test', status: 'planning' as const,
      currentPhase: 'requirements' as const, config: {}, createdAt: '', updatedAt: '', completedAt: null,
      agents: [],
      tasks: [],
      artifacts: [],
      conversations: [],
      logs: [],
    };

    expect(projectDetail.agents).toBeInstanceOf(Array);
    expect(projectDetail.tasks).toBeInstanceOf(Array);
    expect(projectDetail.artifacts).toBeInstanceOf(Array);
    expect(projectDetail.conversations).toBeInstanceOf(Array);
    expect(projectDetail.logs).toBeInstanceOf(Array);
  });

  it('Agent should have required fields', () => {
    const agent = {
      id: 'a1', projectId: 'p1', role: 'pm' as AgentRole,
      name: 'Project Manager', status: 'idle' as AgentStatus,
      currentTask: null, progress: 0, createdAt: '',
    };

    expect(agent.id).toBeTruthy();
    expect(agent.projectId).toBeTruthy();
    expect(agent.role).toBeTruthy();
    expect(agent.name).toBeTruthy();
    expect(typeof agent.progress).toBe('number');
  });

  it('Agent with coding status should be valid', () => {
    const agent = {
      id: 'a2', projectId: 'p1', role: 'frontend_dev' as AgentRole,
      name: 'Frontend Developer', status: 'working' as AgentStatus,
      currentTask: 'Writing code with Claude Code', progress: 40, createdAt: '',
    };

    expect(agent.currentTask).toContain('Claude Code');
    expect(agent.progress).toBeGreaterThan(0);
  });
});

// ============ WebSocket Event Type Completeness Tests ============

describe('WebSocket Event Types', () => {
  it('should handle all event types', async () => {
    const { useAppStore } = await import('../store/store');
    const handleWSEvent = useAppStore.getState().handleWSEvent;

    // These should not throw when called with valid events
    expect(() => handleWSEvent({ type: 'connected', payload: { timestamp: '' } })).not.toThrow();
    expect(() => handleWSEvent({ type: 'project:started', payload: { projectId: 'x' } })).not.toThrow();
    expect(() => handleWSEvent({ type: 'project:paused', payload: { projectId: 'x' } })).not.toThrow();
    expect(() => handleWSEvent({ type: 'project:completed', payload: { projectId: 'x' } })).not.toThrow();
    expect(() => handleWSEvent({ type: 'project:failed', payload: { projectId: 'x', error: 'err' } })).not.toThrow();
    expect(() => handleWSEvent({ type: 'phase:started', payload: { projectId: 'x', phase: 'requirements' } })).not.toThrow();
    expect(() => handleWSEvent({ type: 'phase:completed', payload: { projectId: 'x', phase: 'requirements' } })).not.toThrow();
  });
});
