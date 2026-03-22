import { create } from 'zustand';
import type { ProjectDetail, ProjectListItem, Task, Artifact, ActivityLogEntry, WSEvent, AgentStatus } from '../types';


interface AppState {
  // Projects list
  projects: ProjectListItem[];
  setProjects: (projects: ProjectListItem[]) => void;

  // Current project detail
  currentProject: ProjectDetail | null;
  setCurrentProject: (project: ProjectDetail | null) => void;

  // Active steering directive
  activeDirective: string | null;
  setActiveDirective: (d: string | null) => void;

  // WebSocket connected
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Real-time event handlers
  handleWSEvent: (event: WSEvent) => void;

  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Notification state
  notifications: Array<{ id: string; message: string; type: 'info' | 'success' | 'error'; timestamp: number }>;
  addNotification: (message: string, type: 'info' | 'success' | 'error') => void;
  dismissNotification: (id: string) => void;
}

let notifId = 0;

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),

  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  activeDirective: null,
  setActiveDirective: (d) => set({ activeDirective: d }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  notifications: [],
  addNotification: (message, type) => {
    const id = `notif-${++notifId}`;
    set((s) => ({
      notifications: [...s.notifications.slice(-9), { id, message, type, timestamp: Date.now() }],
    }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) }));
    }, 5000);
  },
  dismissNotification: (id) => set((s) => ({
    notifications: s.notifications.filter(n => n.id !== id),
  })),

  handleWSEvent: (event: WSEvent) => {
    const state = get();

    switch (event.type) {
      case 'connected':
        set({ wsConnected: true });
        break;

      case 'project:started': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              status: 'in_progress',
            },
          });
        }
        // Update project list
        set({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, status: 'in_progress' as const } : p
          ),
        });
        state.addNotification('Project build started', 'info');
        break;
      }

      case 'project:completed': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              status: 'completed',
              currentPhase: 'completed',
            },
          });
        }
        set({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, status: 'completed' as const } : p
          ),
        });
        state.addNotification('Project completed successfully!', 'success');
        break;
      }

      case 'project:paused': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              status: 'paused',
            },
          });
        }
        set({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, status: 'paused' as const } : p
          ),
        });
        state.addNotification('Project paused', 'info');
        break;
      }

      case 'project:resumed': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              status: 'in_progress',
            },
          });
        }
        set({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, status: 'in_progress' as const } : p
          ),
        });
        state.addNotification('Project resumed', 'info');
        break;
      }

      case 'project:failed': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              status: 'failed',
            },
          });
        }
        state.addNotification('Project failed: ' + event.payload.error, 'error');
        break;
      }

      case 'phase:started': {
        const { projectId, phase: _phase } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              currentPhase: _phase as any,
            },
          });
        }
        break;
      }

      case 'phase:completed': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          // Phase completed, agents for this phase should be done
        }
        break;
      }

      case 'agent:status': {
        const { projectId, agentId, status, task, progress } = event.payload;
        if (state.currentProject?.id === projectId) {
          const updatedAgents = state.currentProject.agents.map(a =>
            a.id === agentId
              ? { ...a, status: status as AgentStatus, currentTask: task || a.currentTask, progress: progress ?? a.progress }
              : a
          );
          set({
            currentProject: {
              ...state.currentProject,
              agents: updatedAgents,
            },
          });
        }
        break;
      }

      case 'agent:progress': {
        const { projectId, agentId, progress, status } = event.payload;
        if (state.currentProject?.id === projectId) {
          const updatedAgents = state.currentProject.agents.map(a =>
            a.id === agentId
              ? { ...a, progress, status: status as AgentStatus }
              : a
          );
          set({
            currentProject: {
              ...state.currentProject,
              agents: updatedAgents,
            },
          });
        }
        break;
      }

      case 'message:created': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          // Messages are stored per-conversation; no direct update needed
        }
        break;
      }

      case 'task:created': {
        const { projectId, taskId, title, status, assigneeId, phase, description, priority, sprint, estimatedHours } = event.payload;
        if (state.currentProject?.id === projectId) {
          // Don't duplicate if already present
          const exists = state.currentProject.tasks.some(t => t.id === taskId);
          if (!exists) {
            const newTask: Task = {
              id: taskId,
              projectId,
              assigneeId,
              title,
              description: description ?? '',
              status: status as any,
              priority: (priority as any) ?? 'medium',
              sprint: sprint ?? 1,
              phase,
              estimatedHours: estimatedHours ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: status === 'done' ? new Date().toISOString() : null,
            };
            set({
              currentProject: {
                ...state.currentProject,
                tasks: [...state.currentProject.tasks, newTask],
              },
            });
          }
        }
        break;
      }

      case 'task:updated': {
        const { projectId, taskId, status, completedAt } = event.payload;
        if (state.currentProject?.id === projectId) {
          set({
            currentProject: {
              ...state.currentProject,
              tasks: state.currentProject.tasks.map(t =>
                t.id === taskId
                  ? { ...t, status: status as any, completedAt: completedAt ?? t.completedAt, updatedAt: new Date().toISOString() }
                  : t
              ),
            },
          });
        }
        break;
      }

      case 'artifact:created': {
        const { projectId, artifactId, title, type } = event.payload;
        if (state.currentProject?.id === projectId) {
          const newArtifact: Artifact = {
            id: artifactId,
            projectId,
            agentId: null,
            title,
            type: type as any,
            content: '',
            phase: state.currentProject.currentPhase,
            version: 1,
            createdAt: new Date().toISOString(),
          };
          set({
            currentProject: {
              ...state.currentProject,
              artifacts: [...state.currentProject.artifacts, newArtifact],
            },
          });
        }
        break;
      }

      case 'conversation:created': {
        const { projectId, conversationId, title, phase } = event.payload;
        if (state.currentProject?.id === projectId) {
          const newConvo = {
            id: conversationId,
            projectId,
            title,
            phase,
            status: 'active' as const,
            createdAt: new Date().toISOString(),
          };
          set({
            currentProject: {
              ...state.currentProject,
              conversations: [...state.currentProject.conversations, newConvo],
            },
          });
        }
        break;
      }

      case 'activity:log': {
        const { projectId } = event.payload;
        if (state.currentProject?.id === projectId) {
          const entry: ActivityLogEntry = {
            id: event.payload.id,
            projectId,
            agentId: event.payload.agentId ?? null,
            agentRole: event.payload.agentRole ?? null,
            action: event.payload.action,
            details: event.payload.details,
            logType: event.payload.logType as any,
            phase: event.payload.phase ?? null,
            createdAt: event.payload.createdAt,
          };
          set({
            currentProject: {
              ...state.currentProject,
              logs: [...state.currentProject.logs, entry],
            },
          });
        }
        break;
      }

      case 'project:steered': {
        const { directive } = event.payload;
        set({ activeDirective: directive ?? null });
        if (directive) {
          state.addNotification(`PM Directive active: "${directive.substring(0, 60)}${directive.length > 60 ? '...' : ''}"`, 'info');
        }
        break;
      }
    }
  },
}));
