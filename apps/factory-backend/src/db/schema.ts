import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['planning', 'in_progress', 'paused', 'completed', 'failed'] }).notNull().default('planning'),
  currentPhase: text('current_phase', { enum: ['requirements', 'architecture', 'development', 'testing', 'deployment', 'completed'] }).notNull().default('requirements'),
  config: text('config').notNull().default('{}'), // JSON: stack, features, billing, etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  role: text('role', { enum: ['pm', 'ba', 'architect', 'frontend_dev', 'backend_dev', 'qa', 'devops'] }).notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['idle', 'thinking', 'working', 'reviewing', 'blocked', 'done'] }).notNull().default('idle'),
  currentTask: text('current_task'),
  progress: real('progress').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  phase: text('phase').notNull(),
  status: text('status', { enum: ['active', 'resolved', 'archived'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  projectId: text('project_id').notNull().references(() => projects.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  agentRole: text('agent_role').notNull(),
  content: text('content').notNull(),
  messageType: text('message_type', { enum: ['discussion', 'decision', 'question', 'answer', 'task_update', 'review', 'approval'] }).notNull().default('discussion'),
  metadata: text('metadata').default('{}'), // JSON: attachments, references, etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  assigneeId: text('assignee_id').references(() => agents.id),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] }).notNull().default('backlog'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  sprint: integer('sprint').notNull().default(1),
  phase: text('phase').notNull(),
  estimatedHours: real('estimated_hours'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  agentId: text('agent_id').references(() => agents.id),
  title: text('title').notNull(),
  type: text('type', { enum: ['spec', 'architecture', 'code', 'test_report', 'review', 'deployment_config', 'documentation'] }).notNull(),
  content: text('content').notNull(),
  phase: text('phase').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  agentId: text('agent_id'),
  agentRole: text('agent_role'),
  action: text('action').notNull(),
  details: text('details').notNull().default(''),
  logType: text('log_type', { enum: ['info', 'success', 'warning', 'error', 'milestone'] }).notNull().default('info'),
  phase: text('phase'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const phaseMetrics = sqliteTable('phase_metrics', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  phase: text('phase').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  agentDurations: text('agent_durations').notNull().default('{}'), // JSON: { role: { startedAt, completedAt, durationMs } }
  taskCount: integer('task_count').notNull().default(0),
  artifactCount: integer('artifact_count').notNull().default(0),
  messageCount: integer('message_count').notNull().default(0),
  status: text('status', { enum: ['in_progress', 'completed', 'failed'] }).notNull().default('in_progress'),
});

export const generatedFiles = sqliteTable('generated_files', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull().default('unknown'), // ts, tsx, json, etc.
  sizeBytes: integer('size_bytes').notNull().default(0),
  agentRole: text('agent_role'),
  phase: text('phase').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Type exports
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type PhaseMetric = typeof phaseMetrics.$inferSelect;
export type GeneratedFile = typeof generatedFiles.$inferSelect;
