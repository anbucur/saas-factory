import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProjectDetail, ProjectPhase, AgentRole } from '../../types';
import { PHASE_META, PHASE_ORDER, AGENT_ROLE_META } from '../../types';
import { useAppStore } from '../../store/store';
import { api } from '../../lib/api';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  Users,
  FileText,
  KanbanSquare,
  Timer,
  Cpu,
  Zap,
  Send,
  X,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSecs}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

function useElapsedTicker(intervalMs = 1000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

// ─── Orchestrator Status ──────────────────────────────────────────────────────

function OrchestratorRow({ project }: { project: ProjectDetail }) {
  const tick = useElapsedTicker();
  const isRunning = project.status === 'in_progress';
  const currentMetric = project.metrics?.find(m => m.phase === project.currentPhase && m.status === 'in_progress');
  const elapsedMs = currentMetric ? Date.now() - new Date(currentMetric.startedAt).getTime() : 0;

  const activeAgents = project.agents.filter(a => a.status === 'working' || a.status === 'thinking');
  const describeState = () => {
    if (!isRunning) return 'Idle';
    if (project.currentPhase === 'completed') return 'All phases complete';
    if (activeAgents.length > 0) {
      return `Running ${activeAgents.map(a => AGENT_ROLE_META[a.role as AgentRole]?.name ?? a.role).join(', ')}`;
    }
    return `Transitioning to next agent in ${project.currentPhase} phase`;
  };

  void tick; // forces re-render for the elapsed timer

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/70 border border-zinc-700/60">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30">
        <Cpu className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">Temporal Orchestrator</span>
          {isRunning ? (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Running
            </span>
          ) : (
            <span className="text-[10px] text-zinc-600">Idle</span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{describeState()}</p>
      </div>
      {isRunning && elapsedMs > 0 && (
        <span className="text-[10px] text-zinc-500 tabular-nums">{formatDuration(elapsedMs)}</span>
      )}
    </div>
  );
}

// ─── Live Agent Panel ─────────────────────────────────────────────────────────

function LiveAgentPanel({ project }: { project: ProjectDetail }) {
  const tick = useElapsedTicker(2000);
  void tick;

  const activeAgents = project.agents.filter(
    a => a.status === 'working' || a.status === 'thinking' || a.status === 'reviewing'
  );

  if (activeAgents.length === 0) return null;

  const statusLabels: Record<string, string> = {
    thinking: 'Thinking…',
    working: 'Working…',
    reviewing: 'Reviewing…',
  };
  const statusColors: Record<string, string> = {
    thinking: 'bg-amber-400',
    working: 'bg-blue-400',
    reviewing: 'bg-purple-400',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5 text-blue-400" />
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Live Agent Activity</h3>
        <span className="ml-auto text-[10px] text-zinc-600">{activeAgents.length} active</span>
      </div>

      {/* Orchestrator row always at top */}
      <OrchestratorRow project={project} />

      {activeAgents.map(agent => {
        const meta = AGENT_ROLE_META[agent.role as AgentRole];
        if (!meta) return null;
        const dotColor = statusColors[agent.status] ?? 'bg-zinc-500';
        const label = statusLabels[agent.status] ?? agent.status;

        return (
          <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/40">
            <div className="text-lg w-7 text-center">{meta.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">{agent.name}</span>
                <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
                <span className="text-[10px] text-zinc-500">{label}</span>
              </div>
              {agent.currentTask && (
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{agent.currentTask}</p>
              )}
              {agent.progress > 0 && agent.progress < 100 && (
                <div className="mt-1.5 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${agent.progress}%`, backgroundColor: meta.color }}
                  />
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-600 tabular-nums">{agent.progress}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Steering Panel ───────────────────────────────────────────────────────────

function SteeringPanel({ project }: { project: ProjectDetail }) {
  const { activeDirective, setActiveDirective, addNotification } = useAppStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning = project.status === 'in_progress';

  // Sync initial directive from project config
  useEffect(() => {
    try {
      const cfg = typeof project.config === 'string' ? JSON.parse(project.config) : project.config;
      setActiveDirective(cfg?.steeringDirective ?? null);
    } catch { /* ignore */ }
  }, [project.id, setActiveDirective]);

  const handleSend = useCallback(async () => {
    const directive = input.trim();
    if (!directive) return;
    setSending(true);
    try {
      await api.steerProject(project.id, directive);
      setActiveDirective(directive);
      setInput('');
      addNotification('PM directive set — agents will receive it on their next task', 'success');
    } catch (e: any) {
      addNotification(e.message ?? 'Failed to set directive', 'error');
    } finally {
      setSending(false);
    }
  }, [input, project.id, setActiveDirective, addNotification]);

  const handleClear = useCallback(async () => {
    try {
      await api.clearSteer(project.id);
      setActiveDirective(null);
      addNotification('PM directive cleared', 'info');
    } catch { /* ignore */ }
  }, [project.id, setActiveDirective, addNotification]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Steer Project</h3>
        <span className="ml-auto text-xs text-zinc-500">
          Directive is injected into each agent's context on their next task
        </span>
      </div>

      {/* Active directive badge */}
      {activeDirective && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-amber-300 mb-1">Active Directive</div>
            <p className="text-xs text-amber-200/80 leading-relaxed">{activeDirective}</p>
          </div>
          <button
            title="Clear directive"
            onClick={handleClear}
            className="p-1 text-amber-400 hover:text-amber-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRunning
              ? 'e.g. "Skip advanced analytics, focus on core CRUD only" — ⌘Enter to send'
              : 'Start the project to send a directive…'
          }
          disabled={!isRunning || sending}
          rows={2}
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none disabled:opacity-40 transition"
        />
        <div className="flex items-center gap-2 justify-end">
          {activeDirective && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={!isRunning || !input.trim() || sending}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Send Directive'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Overview Component ──────────────────────────────────────────────────

export function ProjectOverview({ project }: Props) {
  const currentPhaseIdx = PHASE_ORDER.indexOf(project.currentPhase);
  const doneTasks = project.tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = project.tasks.filter(t => t.status === 'in_progress').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const activeAgents = project.agents.filter(a => a.status === 'working' || a.status === 'thinking');
  const doneAgents = project.agents.filter(a => a.status === 'done');

  const totalDurationMs = project.metrics?.reduce((sum, m) => {
    if (m.completedAt) {
      return sum + (new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime());
    }
    if (m.status === 'in_progress') {
      return sum + (Date.now() - new Date(m.startedAt).getTime());
    }
    return sum;
  }, 0) ?? 0;

  const estimatedHours = project.tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const isRunning = project.status === 'in_progress';

  return (
    <div className="p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
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
          <div className="text-xs text-zinc-500">
            {inProgressTasks > 0 ? `${inProgressTasks} in progress · ` : ''}{progress}% done
          </div>
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
            <Timer className="w-4 h-4" />
            <span className="text-xs">Duration</span>
          </div>
          <div className="text-xl font-bold text-white">
            {totalDurationMs > 0 ? formatDuration(totalDurationMs) : '-'}
          </div>
          <div className="text-xs text-zinc-500">
            {estimatedHours > 0 ? `${estimatedHours}h estimated` : 'Not started'}
          </div>
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

            const phaseMetric = project.metrics?.find(m => m.phase === phase);
            const phaseDurationMs = phaseMetric
              ? (phaseMetric.completedAt
                ? new Date(phaseMetric.completedAt).getTime() - new Date(phaseMetric.startedAt).getTime()
                : phaseMetric.status === 'in_progress'
                  ? Date.now() - new Date(phaseMetric.startedAt).getTime()
                  : 0)
              : 0;

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
                  {phaseDurationMs > 0 && (
                    <p className="text-[10px] ml-6 mt-1 font-medium" style={{ color: meta.color }}>
                      {formatDuration(phaseDurationMs)}
                    </p>
                  )}
                </div>
                {idx < PHASE_ORDER.length - 2 && (
                  <div className={`w-4 h-px mx-1 ${isCompleted ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live agent activity panel (only when running) */}
      {isRunning && <LiveAgentPanel project={project} />}

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
                    <span className="text-sm font-medium text-white">{agent.name}</span>
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

      {/* Steering Panel */}
      <SteeringPanel project={project} />

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
