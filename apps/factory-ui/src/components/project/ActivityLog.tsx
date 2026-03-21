import { useRef, useEffect, useState, useMemo } from 'react';
import type { ProjectDetail, AgentRole, LogType, ProjectPhase } from '../../types';
import { AGENT_ROLE_META, PHASE_META } from '../../types';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Info, Flag, Search, Filter, Download } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

const LOG_ICONS: Record<LogType, any> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  milestone: Flag,
};

const LOG_COLORS: Record<LogType, string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  milestone: 'text-purple-400',
};

export function ActivityLog({ project }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LogType | ''>('');
  const [filterPhase, setFilterPhase] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [project.logs.length, autoScroll]);

  const filteredLogs = useMemo(() => {
    let result = project.logs;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.action.toLowerCase().includes(lower) || l.details.toLowerCase().includes(lower)
      );
    }
    if (filterType) {
      result = result.filter(l => l.logType === filterType);
    }
    if (filterPhase) {
      result = result.filter(l => l.phase === filterPhase);
    }
    if (filterAgent) {
      result = result.filter(l => l.agentRole === filterAgent);
    }
    return result;
  }, [project.logs, searchQuery, filterType, filterPhase, filterAgent]);

  function handleExport() {
    const lines = filteredLogs.map(l => {
      const time = new Date(l.createdAt).toLocaleString();
      const agent = l.agentRole ? AGENT_ROLE_META[l.agentRole as AgentRole]?.title || l.agentRole : '';
      return `[${time}] [${l.logType.toUpperCase()}] ${agent ? `[${agent}] ` : ''}${l.action} - ${l.details}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-activity-log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activePhases = [...new Set(project.logs.map(l => l.phase).filter(Boolean))];
  const activeAgents = [...new Set(project.logs.map(l => l.agentRole).filter(Boolean))];

  if (project.logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No activity yet</h3>
          <p className="text-sm text-zinc-500">Activity will be logged here as agents work on the project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LogType | '')}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="milestone">Milestone</option>
          </select>
          <select
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All phases</option>
            {activePhases.map(p => (
              <option key={p} value={p!}>{PHASE_META[p as ProjectPhase]?.label || p}</option>
            ))}
          </select>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All agents</option>
            {activeAgents.map(a => (
              <option key={a} value={a!}>{AGENT_ROLE_META[a as AgentRole]?.name || a}</option>
            ))}
          </select>
          <span className="text-[10px] text-zinc-600 ml-auto">
            {filteredLogs.length} of {project.logs.length} entries
          </span>
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div className="space-y-1">
        {filteredLogs.map((log) => {
          const Icon = LOG_ICONS[log.logType as LogType] || Info;
          const colorClass = LOG_COLORS[log.logType as LogType] || 'text-zinc-400';
          const agentMeta = log.agentRole ? AGENT_ROLE_META[log.agentRole as AgentRole] : null;
          const phaseMeta = log.phase ? PHASE_META[log.phase as ProjectPhase] : null;
          const isMilestone = log.logType === 'milestone';

          return (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-900 ${
                isMilestone ? 'bg-zinc-900 border border-zinc-800' : ''
              }`}
            >
              <div className={`mt-0.5 ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {agentMeta && (
                    <span className="text-xs text-zinc-400">{agentMeta.emoji} {agentMeta.title}</span>
                  )}
                  <span className={`text-xs ${isMilestone ? 'font-medium text-white' : 'text-zinc-300'}`}>
                    {log.action}
                  </span>
                  {phaseMeta && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: phaseMeta.color }} />
                      {phaseMeta.label}
                    </span>
                  )}
                </div>
                {log.details && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">{log.details}</p>
                )}
              </div>
              <span className="text-[10px] text-zinc-600 flex-shrink-0">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
