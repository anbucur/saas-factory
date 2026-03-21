import type { ProjectDetail, ProjectPhase, AgentRole } from '../../types';
import { PHASE_META, PHASE_ORDER, AGENT_ROLE_META } from '../../types';
import { CheckCircle2, Circle, Loader2, Clock, Users, FileText, KanbanSquare } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

export function ProjectOverview({ project }: Props) {
  const currentPhaseIdx = PHASE_ORDER.indexOf(project.currentPhase);
  const doneTasks = project.tasks.filter(t => t.status === 'done').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const activeAgents = project.agents.filter(a => a.status === 'working' || a.status === 'thinking');
  const doneAgents = project.agents.filter(a => a.status === 'done');

  return (
    <div className="p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Agents</span>
          </div>
          <div className="text-2xl font-bold text-white">{project.agents.length}</div>
          <div className="text-xs text-zinc-500">{activeAgents.length} active, {doneAgents.length} done</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <KanbanSquare className="w-4 h-4" />
            <span className="text-xs">Tasks</span>
          </div>
          <div className="text-2xl font-bold text-white">{doneTasks}/{totalTasks}</div>
          <div className="text-xs text-zinc-500">{progress}% complete</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Artifacts</span>
          </div>
          <div className="text-2xl font-bold text-white">{project.artifacts.length}</div>
          <div className="text-xs text-zinc-500">Documents generated</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <div className="text-lg font-bold text-white">
            {new Date(project.createdAt).toLocaleDateString()}
          </div>
          <div className="text-xs text-zinc-500">
            {project.completedAt ? `Done ${new Date(project.completedAt).toLocaleDateString()}` : 'In progress'}
          </div>
        </div>
      </div>

      {/* Phase Pipeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Development Pipeline</h3>
        <div className="flex items-center gap-2">
          {PHASE_ORDER.filter(p => p !== 'completed').map((phase, idx) => {
            const meta = PHASE_META[phase];
            const isCompleted = idx < currentPhaseIdx;
            const isCurrent = phase === project.currentPhase;
            const isLocked = idx > currentPhaseIdx;

            return (
              <div key={phase} className="flex items-center flex-1">
                <div
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : isCompleted
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-zinc-800 bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-600" />
                    )}
                    <span className={`text-xs font-medium ${
                      isCurrent ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-zinc-500'
                    }`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 ml-6">{meta.description}</p>
                </div>
                {idx < PHASE_ORDER.length - 2 && (
                  <div className={`w-4 h-px mx-1 ${isCompleted ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Team Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Agent Team</h3>
        <div className="grid grid-cols-2 gap-3">
          {project.agents.map((agent) => {
            const meta = AGENT_ROLE_META[agent.role as AgentRole];
            if (!meta) return null;

            const statusBg: Record<string, string> = {
              idle: 'bg-zinc-700',
              thinking: 'bg-amber-500 animate-pulse',
              working: 'bg-blue-500 animate-pulse',
              reviewing: 'bg-purple-500',
              blocked: 'bg-red-500',
              done: 'bg-emerald-500',
            };

            return (
              <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="text-xl">{meta.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{meta.name}</span>
                    <span className={`w-2 h-2 rounded-full ${statusBg[agent.status]}`} />
                  </div>
                  <div className="text-xs text-zinc-500">
                    {agent.currentTask || agent.status}
                  </div>
                  {agent.progress > 0 && agent.progress < 100 && (
                    <div className="mt-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${agent.progress}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Config */}
      {project.config && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Project Configuration</h3>
          <div className="grid grid-cols-2 gap-6">
            {project.config.stack && project.config.stack.length > 0 && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Tech Stack</label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {project.config.stack.map((s: string) => (
                    <span key={s} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {project.config.features && project.config.features.length > 0 && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Features</label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {project.config.features.map((f: string) => (
                    <span key={f} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
