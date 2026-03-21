import { useEffect, useState } from 'react';
import type { ProjectDetail, AgentRole } from '../../types';
import { AGENT_ROLE_META, PHASE_META } from '../../types';
import { api } from '../../lib/api';
import { Terminal } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: 'Idle', color: 'text-zinc-400', bg: 'bg-zinc-700' },
  thinking: { label: 'Thinking', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  working: { label: 'Working', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  reviewing: { label: 'Reviewing', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  blocked: { label: 'Blocked', color: 'text-red-400', bg: 'bg-red-500/20' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

const CODING_ROLES: AgentRole[] = ['frontend_dev', 'backend_dev', 'devops', 'qa'];

export function AgentTeam({ project }: Props) {
  const [codingAgent, setCodingAgent] = useState<{ available: boolean; name: string } | null>(null);

  useEffect(() => {
    api.getCodingAgentStatus().then(setCodingAgent).catch(() => {});
  }, []);

  return (
    <div className="p-6">
      {codingAgent && (
        <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          codingAgent.available
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
        }`}>
          <Terminal className="w-3.5 h-3.5" />
          {codingAgent.available
            ? `${codingAgent.name} is available - coding agents (FE Dev, BE Dev, QA, DevOps) will use it for code generation`
            : 'No coding CLI available - using LLM fallback for code generation'}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {project.agents.map((agent) => {
          const roleMeta = AGENT_ROLE_META[agent.role as AgentRole];
          const statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
          if (!roleMeta) return null;

          // Find tasks assigned to this agent
          const agentTasks = project.tasks.filter(t => t.assigneeId === agent.id);
          const doneTasks = agentTasks.filter(t => t.status === 'done').length;

          // Find artifacts from this agent
          const agentArtifacts = project.artifacts.filter(a => a.agentId === agent.id);

          return (
            <div
              key={agent.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${roleMeta.color}20` }}
                  >
                    {roleMeta.emoji}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{roleMeta.name}</h3>
                    <p className="text-xs text-zinc-500">{roleMeta.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {CODING_ROLES.includes(agent.role as AgentRole) && codingAgent?.available && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                      <Terminal className="w-2.5 h-2.5" />
                      {codingAgent.name}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Progress */}
              {agent.progress > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Progress</span>
                    <span className="text-xs text-zinc-400">{agent.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${agent.progress}%`, backgroundColor: roleMeta.color }}
                    />
                  </div>
                </div>
              )}

              {/* Current Task */}
              {agent.currentTask && (
                <div className="mb-4 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Current Task</span>
                  <p className="text-xs text-zinc-300 mt-0.5">{agent.currentTask}</p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>{doneTasks}/{agentTasks.length} tasks</span>
                <span>{agentArtifacts.length} artifacts</span>
              </div>

              {/* Tasks */}
              {agentTasks.length > 0 && (
                <div className="mt-3 space-y-1">
                  {agentTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                      <span className={task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-400'}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {agentTasks.length > 5 && (
                    <span className="text-[10px] text-zinc-600">+{agentTasks.length - 5} more</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
