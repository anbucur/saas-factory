import { useRef, useEffect } from 'react';
import type { ProjectDetail, AgentRole, LogType } from '../../types';
import { AGENT_ROLE_META } from '../../types';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Info, Flag } from 'lucide-react';

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project.logs.length]);

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
      <div className="space-y-1">
        {project.logs.map((log, idx) => {
          const Icon = LOG_ICONS[log.logType as LogType] || Info;
          const colorClass = LOG_COLORS[log.logType as LogType] || 'text-zinc-400';
          const agentMeta = log.agentRole ? AGENT_ROLE_META[log.agentRole as AgentRole] : null;

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
