// ============ Agent Types ============

export type AgentRole = 'pm' | 'ba' | 'architect' | 'frontend_dev' | 'backend_dev' | 'qa' | 'devops';

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'reviewing' | 'blocked' | 'done';

export interface Agent {
  id: string;
  projectId: string;
  role: AgentRole;
  name: string;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
  createdAt: string;
}

export interface AgentRoleInfo {
  role: AgentRole;
  name: string;
  title: string;
  emoji: string;
  color: string;
  description: string;
  capabilities: string[];
  participatesInPhases: string[];
}

// ============ Project Types ============

export type ProjectStatus = 'planning' | 'in_progress' | 'paused' | 'completed' | 'failed';

export type ProjectPhase = 'requirements' | 'architecture' | 'development' | 'testing' | 'deployment' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  currentPhase: ProjectPhase;
  config: ProjectConfig;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ProjectConfig {
  stack?: string[];
  features?: string[];
  billingMode?: 'subscription' | 'usage' | 'none';
}

export interface ProjectListItem extends Project {
  agentCount: number;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
}

export interface ProjectDetail extends Project {
  agents: Agent[];
  tasks: Task[];
  artifacts: Artifact[];
  conversations: Conversation[];
  logs: ActivityLogEntry[];
}

// ============ Task Types ============

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  sprint: number;
  phase: string;
  estimatedHours: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ============ Conversation Types ============

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  phase: string;
  status: 'active' | 'resolved' | 'archived';
  createdAt: string;
}

export type MessageType = 'discussion' | 'decision' | 'question' | 'answer' | 'task_update' | 'review' | 'approval';

export interface Message {
  id: string;
  conversationId: string;
  projectId: string;
  agentId: string;
  agentRole: string;
  content: string;
  messageType: MessageType;
  metadata: string;
  createdAt: string;
}

// ============ Artifact Types ============

export type ArtifactType = 'spec' | 'architecture' | 'code' | 'test_report' | 'review' | 'deployment_config' | 'documentation';

export interface Artifact {
  id: string;
  projectId: string;
  agentId: string | null;
  title: string;
  type: ArtifactType;
  content: string;
  phase: string;
  version: number;
  createdAt: string;
}

// ============ Activity Log ============

export type LogType = 'info' | 'success' | 'warning' | 'error' | 'milestone';

export interface ActivityLogEntry {
  id: string;
  projectId: string;
  agentId: string | null;
  agentRole: string | null;
  action: string;
  details: string;
  logType: LogType;
  phase: string | null;
  createdAt: string;
}

// ============ WebSocket Events ============

export type WSEvent =
  | { type: 'connected'; payload: { timestamp: string } }
  | { type: 'project:created'; payload: { projectId: string; name: string; description: string } }
  | { type: 'project:started'; payload: { projectId: string } }
  | { type: 'project:completed'; payload: { projectId: string } }
  | { type: 'project:failed'; payload: { projectId: string; error: string } }
  | { type: 'phase:started'; payload: { projectId: string; phase: string } }
  | { type: 'phase:completed'; payload: { projectId: string; phase: string } }
  | { type: 'agent:status'; payload: { projectId: string; agentId: string; role: string; status: AgentStatus; task?: string; progress?: number } }
  | { type: 'agent:progress'; payload: { projectId: string; agentId: string; role: string; progress: number; status: string } }
  | { type: 'message:created'; payload: { projectId: string; conversationId: string; message: Message } }
  | { type: 'task:created'; payload: { projectId: string; taskId: string; title: string; status: string; assigneeId: string; phase: string } }
  | { type: 'artifact:created'; payload: { projectId: string; artifactId: string; title: string; type: string } }
  | { type: 'activity:log'; payload: ActivityLogEntry & { createdAt: string } };

// ============ UI Constants ============

export const AGENT_ROLE_META: Record<AgentRole, { name: string; emoji: string; color: string; title: string }> = {
  pm: { name: 'Project Manager', emoji: '📋', color: '#3b82f6', title: 'PM' },
  ba: { name: 'Business Analyst', emoji: '📊', color: '#8b5cf6', title: 'BA' },
  architect: { name: 'Solution Architect', emoji: '🏗️', color: '#f59e0b', title: 'SA' },
  frontend_dev: { name: 'Frontend Developer', emoji: '🎨', color: '#06b6d4', title: 'FE' },
  backend_dev: { name: 'Backend Developer', emoji: '⚙️', color: '#10b981', title: 'BE' },
  qa: { name: 'QA Engineer', emoji: '🧪', color: '#ef4444', title: 'QA' },
  devops: { name: 'DevOps Engineer', emoji: '🚀', color: '#f97316', title: 'DevOps' },
};

export const PHASE_META: Record<ProjectPhase, { label: string; description: string; color: string }> = {
  requirements: { label: 'Requirements', description: 'Gathering and analyzing project requirements', color: '#8b5cf6' },
  architecture: { label: 'Architecture', description: 'Designing system architecture and technical stack', color: '#f59e0b' },
  development: { label: 'Development', description: 'Building the application', color: '#06b6d4' },
  testing: { label: 'Testing', description: 'Quality assurance and bug fixing', color: '#ef4444' },
  deployment: { label: 'Deployment', description: 'Deploying to production', color: '#10b981' },
  completed: { label: 'Completed', description: 'Project completed successfully', color: '#22c55e' },
};

export const PHASE_ORDER: ProjectPhase[] = ['requirements', 'architecture', 'development', 'testing', 'deployment', 'completed'];
