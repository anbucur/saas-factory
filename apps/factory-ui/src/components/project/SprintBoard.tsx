import type { ProjectDetail, AgentRole, TaskStatus, TaskPriority } from '../../types';
import { AGENT_ROLE_META } from '../../types';

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

export function SprintBoard({ project }: Props) {
  // Group tasks by sprint
  const sprints = [...new Set(project.tasks.map(t => t.sprint))].sort();
  const activeSprint = sprints[sprints.length - 1] || 1;

  const sprintTasks = project.tasks.filter(t => t.sprint === activeSprint);

  return (
    <div className="p-6">
      {/* Sprint selector */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-white">Sprint Board</h3>
        <div className="flex gap-1">
          {sprints.map(s => (
            <span
              key={s}
              className={`px-2 py-0.5 rounded text-xs ${
                s === activeSprint ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              Sprint {s}
            </span>
          ))}
        </div>
        <span className="text-xs text-zinc-500 ml-auto">
          {sprintTasks.filter(t => t.status === 'done').length}/{sprintTasks.length} tasks done
        </span>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map(column => {
          const columnTasks = sprintTasks.filter(t => t.status === column.id);
          return (
            <div key={column.id} className="min-h-[300px]">
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg bg-zinc-900 border-t-2 ${column.color}`}>
                <span className="text-xs font-medium text-zinc-300">{column.label}</span>
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2 pt-2">
                {columnTasks.map(task => {
                  const assignee = project.agents.find(a => a.id === task.assigneeId);
                  const assigneeMeta = assignee ? AGENT_ROLE_META[assignee.role as AgentRole] : null;

                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                        <span className="text-xs text-zinc-300 leading-relaxed">{task.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        {assigneeMeta && (
                          <span className="text-[10px] flex items-center gap-1 text-zinc-500">
                            {assigneeMeta.emoji} {assigneeMeta.title}
                          </span>
                        )}
                        {task.estimatedHours && (
                          <span className="text-[10px] text-zinc-600">{task.estimatedHours}h</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div className="p-4 text-center text-[10px] text-zinc-600 border border-dashed border-zinc-800 rounded-lg">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All sprints summary */}
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
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-12 text-right">{progress}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
