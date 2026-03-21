const API_BASE = 'http://localhost:3010/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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

  // Logs
  getProjectLogs: (projectId: string) => request<any[]>(`/projects/${projectId}/logs`),

  // Health
  health: () => request<{ status: string; timestamp: string }>('/health'),
};
