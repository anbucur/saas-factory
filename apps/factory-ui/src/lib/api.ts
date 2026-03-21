import type { ProjectAnalytics, Deployment, DeploymentOption, StackInfo } from '../types';

const API_BASE = 'http://localhost:3010/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const storedKey = localStorage.getItem('minimax_api_key')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (storedKey) {
    headers['X-Minimax-Api-Key'] = storedKey
  }
  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Projects
  listProjects: () => request<any[]>('/projects'),

  getProject: (id: string) => request<any>(`/projects/${id}`),

  createProject: (data: { name: string; description: string; config?: any }) =>
    request<{ id: string; status: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startProject: (id: string) =>
    request<{ status: string }>(`/projects/${id}/start`, { method: 'POST' }),

  deleteProject: (id: string) =>
    request<{ status: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // Agents
  getProjectAgents: (projectId: string) => request<any[]>(`/projects/${projectId}/agents`),

  // Conversations
  getProjectConversations: (projectId: string) => request<any[]>(`/projects/${projectId}/conversations`),

  getConversationMessages: (projectId: string, conversationId: string) =>
    request<any[]>(`/projects/${projectId}/conversations/${conversationId}/messages`),

  // Tasks
  getProjectTasks: (projectId: string) => request<any[]>(`/projects/${projectId}/tasks`),

  updateTask: (projectId: string, taskId: string, data: any) =>
    request<{ status: string }>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Artifacts
  getProjectArtifacts: (projectId: string) => request<any[]>(`/projects/${projectId}/artifacts`),

  searchArtifacts: (projectId: string, params: { q?: string; type?: string; phase?: string }) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.type) query.set('type', params.type);
    if (params.phase) query.set('phase', params.phase);
    return request<any[]>(`/projects/${projectId}/artifacts/search?${query.toString()}`);
  },

  // Logs
  getProjectLogs: (projectId: string) => request<any[]>(`/projects/${projectId}/logs`),

  // Pause / Resume
  pauseProject: (id: string) =>
    request<{ status: string }>(`/projects/${id}/pause`, { method: 'POST' }),

  resumeProject: (id: string) =>
    request<{ status: string }>(`/projects/${id}/resume`, { method: 'POST' }),

  steerProject: (id: string, directive: string) =>
    request<{ ok: boolean; directive: string }>(`/projects/${id}/steer`, {
      method: 'POST',
      body: JSON.stringify({ directive }),
    }),

  clearSteer: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}/steer`, { method: 'DELETE' }),

  // Metrics & Analytics
  getProjectMetrics: (projectId: string) => request<any[]>(`/projects/${projectId}/metrics`),

  getProjectAnalytics: (projectId: string) => request<ProjectAnalytics>(`/projects/${projectId}/analytics`),

  // Generated Files
  getProjectFiles: (projectId: string) =>
    request<{ directory: string; exists: boolean; files: Array<{ path: string; type: string; size: number }>; totalFiles: number; totalSize: number }>(`/projects/${projectId}/files`),

  getFileContent: (projectId: string, filePath: string) =>
    request<{ path: string; content: string; size: number; modifiedAt: string }>(`/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`),

  // Export
  exportProject: (projectId: string) => request<any>(`/projects/${projectId}/export`),

  // Deployments
  getDeploymentOptions: (projectId: string) =>
    request<{ stack: StackInfo; options: DeploymentOption[]; projectDir: string }>(`/projects/${projectId}/deploy/options`),

  deployProject: (projectId: string, strategy: string) =>
    request<{ deploymentId?: string; url?: string; success?: boolean; error?: string; status?: string }>(`/projects/${projectId}/deploy`, {
      method: 'POST',
      body: JSON.stringify({ strategy }),
    }),

  getDeployments: (projectId: string) =>
    request<Deployment[]>(`/projects/${projectId}/deployments`),

  stopDeployment: (projectId: string, deploymentId: string) =>
    request<{ status: string }>(`/projects/${projectId}/deployments/${deploymentId}/stop`, { method: 'POST' }),

  checkDeploymentHealth: (projectId: string, deploymentId: string) =>
    request<{ healthy: boolean; details: string }>(`/projects/${projectId}/deployments/${deploymentId}/health`),

  cleanupDeployments: (projectId: string) =>
    request<{ removed: number }>(`/projects/${projectId}/deployments/cleanup`, { method: 'POST' }),

  getDeploymentLogs: (projectId: string, deploymentId: string) =>
    request<{ buildLog: string; errorLog: string }>(`/projects/${projectId}/deployments/${deploymentId}/logs`),

  // Coding agent
  getCodingAgentStatus: () =>
    request<{ available: boolean; name: string }>('/coding-agent/status'),

  // Health
  health: () => request<{ status: string; timestamp: string; codingAgent?: { available: boolean; name: string } }>('/health'),

  // Settings - set runtime API key
  setApiKey: (apiKey: string) =>
    request<{ ok: boolean; message?: string }>('/settings/api-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
};
