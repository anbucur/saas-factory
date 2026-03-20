/**
 * SprintBoard - Task management view
 */

import { useMissionControlStore } from '../store/missionControlStore'

export function SprintBoard() {
  const { sprints, currentSprintIndex, updateSprintTask } = useMissionControlStore()

  // Demo sprints if none exist
  const demoSprints = sprints.length > 0 ? sprints : [
    {
      id: 'sprint-1',
      name: 'Sprint 1: Foundation',
      status: 'active' as const,
      progress: 65,
      tasks: [
        { id: 't1', title: 'Setup project structure', assignee: 'dev1' as const, status: 'done' as const, progress: 100 },
        { id: 't2', title: 'Design database schema', assignee: 'dev2' as const, status: 'done' as const, progress: 100 },
        { id: 't3', title: 'Build auth system', assignee: 'dev1' as const, status: 'in_progress' as const, progress: 75 },
        { id: 't4', title: 'Create API endpoints', assignee: 'dev2' as const, status: 'in_progress' as const, progress: 50 },
      ],
    },
    {
      id: 'sprint-2',
      name: 'Sprint 2: Core Features',
      status: 'pending' as const,
      progress: 0,
      tasks: [
        { id: 't5', title: 'Build dashboard UI', assignee: 'dev1' as const, status: 'todo' as const, progress: 0 },
        { id: 't6', title: 'Implement user profiles', assignee: 'dev2' as const, status: 'todo' as const, progress: 0 },
        { id: 't7', title: 'Add notifications', assignee: 'dev1' as const, status: 'todo' as const, progress: 0 },
        { id: 't8', title: 'Setup WebSocket', assignee: 'dev2' as const, status: 'todo' as const, progress: 0 },
      ],
    },
    {
      id: 'sprint-3',
      name: 'Sprint 3: Integration',
      status: 'pending' as const,
      progress: 0,
      tasks: [
        { id: 't9', title: 'Integrate payments', assignee: 'dev1' as const, status: 'todo' as const, progress: 0 },
        { id: 't10', title: 'Add email system', assignee: 'dev2' as const, status: 'todo' as const, progress: 0 },
        { id: 't11', title: 'Build reporting', assignee: 'dev1' as const, status: 'todo' as const, progress: 0 },
        { id: 't12', title: 'Performance optimization', assignee: 'dev2' as const, status: 'todo' as const, progress: 0 },
      ],
    },
  ]

  const statusColors: Record<string, string> = {
    todo: 'bg-zinc-700 text-zinc-400',
    in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    review: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    done: 'bg-green-500/20 text-green-400 border border-green-500/30',
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Sprint Board</h2>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live Updates
          </div>
        </div>

        <div className="space-y-6">
          {demoSprints.map((sprint, sprintIndex) => (
            <div 
              key={sprint.id}
              className={`
                rounded-xl border overflow-hidden
                ${sprint.status === 'active' ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900/50'}
              `}
            >
              {/* Sprint header */}
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{sprint.status === 'active' ? '🔥' : sprint.status === 'complete' ? '✅' : '📋'}</span>
                  <h3 className="font-semibold">{sprint.name}</h3>
                  {sprint.status === 'active' && (
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">Active</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-500">
                    {sprint.tasks.filter(t => t.status === 'done').length}/{sprint.tasks.length} tasks
                  </span>
                  <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${sprint.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-400">{sprint.progress}%</span>
                </div>
              </div>

              {/* Tasks grid */}
              <div className="p-4 grid grid-cols-2 gap-3">
                {sprint.tasks.map(task => (
                  <div 
                    key={task.id}
                    className={`
                      p-3 rounded-lg border transition-all cursor-pointer
                      ${statusColors[task.status]}
                      ${task.status === 'todo' ? 'hover:border-zinc-600' : ''}
                      ${task.status === 'in_progress' ? 'hover:border-blue-400' : ''}
                    `}
                    onClick={() => {
                      if (task.status === 'todo') {
                        updateSprintTask(sprint.id, task.id, 'in_progress', 10)
                      } else if (task.status === 'in_progress') {
                        updateSprintTask(sprint.id, task.id, 'review', 90)
                      } else if (task.status === 'review') {
                        updateSprintTask(sprint.id, task.id, 'done', 100)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{task.assignee === 'dev1' ? '💻' : '💻'}</span>
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      <span className="text-xs">
                        {task.status === 'todo' && '○'}
                        {task.status === 'in_progress' && '◐'}
                        {task.status === 'review' && '👀'}
                        {task.status === 'done' && '✓'}
                      </span>
                    </div>
                    
                    {/* Progress bar for in-progress tasks */}
                    {task.status === 'in_progress' && (
                      <div className="mt-2">
                        <div className="h-1 bg-zinc-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{task.progress}% complete</p>
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {task.assignee === 'dev1' ? 'Dev Alex' : 'Dev Jordan'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        task.status === 'review' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-zinc-700 text-zinc-500'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sprint summary */}
        <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-semibold mb-3">Sprint Summary</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">
                {demoSprints.flatMap(s => s.tasks).filter(t => t.status === 'done').length}
              </p>
              <p className="text-xs text-zinc-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {demoSprints.flatMap(s => s.tasks).filter(t => t.status === 'in_progress').length}
              </p>
              <p className="text-xs text-zinc-500">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">
                {demoSprints.flatMap(s => s.tasks).filter(t => t.status === 'review').length}
              </p>
              <p className="text-xs text-zinc-500">In Review</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-400">
                {demoSprints.flatMap(s => s.tasks).filter(t => t.status === 'todo').length}
              </p>
              <p className="text-xs text-zinc-500">To Do</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
