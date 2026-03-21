import { useState } from 'react';
import type { ProjectDetail, AgentRole, TaskStatus, TaskPriority, Task } from '../../types';
import { AGENT_ROLE_META } from '../../types';
import { api } from '../../lib/api';
import { GripVertical, Clock, X, Calendar, User, Flag, Hash } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'border-zinc-600' },
  { id: 'todo', label: 'To Do', color: 'border-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-500' },
  { id: 'review', label: 'Review', color: 'border-purple-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-zinc-600',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'bg-zinc-800 text-zinc-400',
  medium: 'bg-blue-500/15 text-blue-400',
  high: 'bg-amber-500/15 text-amber-400',
  critical: 'bg-red-500/15 text-red-400',
};

export function SprintBoard({ project }: Props) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeSprint, setActiveSprint] = useState<number | null>(null);

  const sprints = [...new Set(project.tasks.map(t => t.sprint))].sort();
  const currentSprint = activeSprint ?? (sprints[sprints.length - 1] || 1);
  const sprintTasks = project.tasks.filter(t => t.sprint === currentSprint);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, columnId: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTaskId) return;
    const task = project.tasks.find(t => t.id === draggedTaskId);
    if (!task || task.status === newStatus) { setDraggedTaskId(null); return; }
    task.status = newStatus;
    if (newStatus === 'done') task.completedAt = new Date().toISOString();
    setDraggedTaskId(null);
    try { await api.updateTask(project.id, draggedTaskId, { status: newStatus }); }
    catch (err) { console.error('Failed to update task:', err); }
  }

  const totalEstimated = sprintTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const doneEstimated = sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);

  return (
    <>
      <div className="p-6">
        {/* Sprint selector */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-white">Sprint Board</h3>
          <div className="flex gap-1">
            {sprints.map(s => (
              <button
                key={s}
                onClick={() => setActiveSprint(s)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  s === currentSprint ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                }`}
              >
                Sprint {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {doneEstimated}/{totalEstimated}h
            </span>
            <span>{sprintTasks.filter(t => t.status === 'done').length}/{sprintTasks.length} tasks done</span>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-5 gap-3">
          {COLUMNS.map(column => {
            const columnTasks = sprintTasks.filter(t => t.status === column.id);
            const isDragOver = dragOverColumn === column.id;
            return (
              <div
                key={column.id}
                className="min-h-[300px]"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg bg-zinc-900 border-t-2 ${column.color}`}>
                  <span className="text-xs font-medium text-zinc-300">{column.label}</span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{columnTasks.length}</span>
                </div>
                <div className={`transition-colors ${isDragOver ? 'bg-blue-500/5 border border-dashed border-blue-500/30 rounded-b-lg' : ''}`}>
                  <div className="space-y-2 pt-2 min-h-[50px]">
                    {columnTasks.map(task => {
                      const assignee = project.agents.find(a => a.id === task.assigneeId);
                      const assigneeMeta = assignee ? AGENT_ROLE_META[assignee.role as AgentRole] : null;
                      const isDragging = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedTask(task)}
                          className={`p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing ${
                            isDragging ? 'opacity-40' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <GripVertical className="w-3 h-3 text-zinc-700 mt-0.5 flex-shrink-0" />
                            <div className="flex items-start gap-1.5 flex-1">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                              <span className="text-xs text-zinc-300 leading-relaxed">{task.title}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between ml-5">
                            {assigneeMeta && (
                              <span className="text-[10px] flex items-center gap-1 text-zinc-500">
                                {assigneeMeta.emoji} {assignee?.name || assigneeMeta.title}
                              </span>
                            )}
                            {task.estimatedHours && (
                              <span className="text-[10px] text-zinc-600">{task.estimatedHours}h</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {columnTasks.length === 0 && !isDragOver && (
                      <div className="p-4 text-center text-[10px] text-zinc-600 border border-dashed border-zinc-800 rounded-lg">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sprint summary */}
        {sprints.length > 1 && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h4 className="text-xs font-medium text-zinc-400 mb-3">Sprint Summary</h4>
            <div className="space-y-2">
              {sprints.map(s => {
                const sTasks = project.tasks.filter(t => t.sprint === s);
                const sDone = sTasks.filter(t => t.status === 'done').length;
                const progress = sTasks.length > 0 ? Math.round((sDone / sTasks.length) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-16">Sprint {s}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-16 text-right">{sDone}/{sTasks.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Large centered task modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b border-zinc-800">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_BADGE[selectedTask.priority]}`}>
                    {PRIORITY_LABELS[selectedTask.priority]}
                  </span>
                  <span className="text-[10px] text-zinc-500 capitalize bg-zinc-800 px-2 py-0.5 rounded-full">
                    {selectedTask.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white leading-tight">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-6">
              {selectedTask.description && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Assignee</span>
                  </div>
                  {(() => {
                    const assignee = project.agents.find(a => a.id === selectedTask.assigneeId);
                    const meta = assignee ? AGENT_ROLE_META[assignee.role as AgentRole] : null;
                    return meta ? (
                      <span className="text-sm text-zinc-200">{meta.emoji} {meta.name}</span>
                    ) : (
                      <span className="text-sm text-zinc-500">Unassigned</span>
                    );
                  })()}
                </div>

                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Flag className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[selectedTask.priority]}`} />
                    <span className="text-sm text-zinc-200">{PRIORITY_LABELS[selectedTask.priority]}</span>
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Phase / Sprint</span>
                  </div>
                  <span className="text-sm text-zinc-200 capitalize">{selectedTask.phase} · Sprint {selectedTask.sprint}</span>
                </div>

                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Estimated</span>
                  </div>
                  <span className="text-sm text-zinc-200">{selectedTask.estimatedHours ?? '—'}h</span>
                </div>

                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Created</span>
                  </div>
                  <span className="text-sm text-zinc-200">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                </div>

                {selectedTask.completedAt && (
                  <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-500 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Completed</span>
                    </div>
                    <span className="text-sm text-emerald-400">{new Date(selectedTask.completedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Change status */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Move to</p>
                <div className="flex flex-wrap gap-2">
                  {COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={async () => {
                        selectedTask.status = col.id;
                        setSelectedTask({ ...selectedTask });
                        await api.updateTask(project.id, selectedTask.id, { status: col.id });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedTask.status === col.id
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
