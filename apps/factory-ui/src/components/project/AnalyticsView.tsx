import { useState, useEffect } from 'react';
import type { ProjectDetail, ProjectAnalytics, AgentRole, ArtifactType, ProjectPhase } from '../../types';
import { AGENT_ROLE_META, PHASE_META, PHASE_ORDER } from '../../types';
import { api } from '../../lib/api';
import { BarChart3, Clock, Zap, TrendingUp, Download } from 'lucide-react';

const ARTIFACT_COLORS: Record<string, string> = {
  spec: 'text-purple-400 bg-purple-500/10',
  architecture: 'text-amber-400 bg-amber-500/10',
  code: 'text-cyan-400 bg-cyan-500/10',
  test_report: 'text-red-400 bg-red-500/10',
  review: 'text-blue-400 bg-blue-500/10',
  deployment_config: 'text-emerald-400 bg-emerald-500/10',
  documentation: 'text-zinc-400 bg-zinc-500/10',
};

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  spec: 'Specification',
  architecture: 'Architecture',
  code: 'Code',
  test_report: 'Test Report',
  review: 'Review',
  deployment_config: 'Deploy Config',
  documentation: 'Documentation',
};

interface Props {
  project: ProjectDetail;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSecs}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AnalyticsView({ project }: Props) {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [project.id]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const data = await api.getProjectAnalytics(project.id);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const data = await api.exportProject(project.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No analytics available</h3>
          <p className="text-sm text-zinc-500">Start the project to see performance metrics</p>
        </div>
      </div>
    );
  }

  const maxPhaseDuration = Math.max(...analytics.phaseDurations.map(p => p.durationMs), 1);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Total Duration</span>
          </div>
          <div className="text-xl font-bold text-white">{formatDuration(analytics.totalDurationMs)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Tasks</span>
          </div>
          <div className="text-xl font-bold text-white">{analytics.totals.tasks}</div>
          <div className="text-[10px] text-zinc-500">{analytics.totals.estimatedHours}h estimated</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Artifacts</span>
          </div>
          <div className="text-xl font-bold text-white">{analytics.totals.artifacts}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Messages</span>
          </div>
          <div className="text-xl font-bold text-white">{analytics.totals.messages}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-center">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Project
          </button>
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Phase Timeline</h3>
        <div className="space-y-3">
          {analytics.phaseDurations.map((phase) => {
            const meta = PHASE_META[phase.phase as ProjectPhase];
            const widthPct = Math.max((phase.durationMs / maxPhaseDuration) * 100, 2);

            return (
              <div key={phase.phase}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta?.color || '#666' }} />
                    <span className="text-xs font-medium text-zinc-300">{meta?.label || phase.phase}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      phase.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      phase.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {phase.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                    <span>{phase.taskCount} tasks</span>
                    <span>{phase.artifactCount} artifacts</span>
                    <span>{phase.messageCount} messages</span>
                    <span className="font-medium text-zinc-400">{formatDuration(phase.durationMs)}</span>
                  </div>
                </div>
                <div className="h-6 bg-zinc-800 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: meta?.color || '#666',
                      opacity: 0.7,
                    }}
                  />
                  {/* Agent duration segments within phase */}
                  <div className="absolute inset-0 flex items-center px-1 gap-0.5">
                    {Object.entries(phase.agentDurations).map(([role, dur]) => {
                      const agentMeta = AGENT_ROLE_META[role as AgentRole];
                      const agentWidthPct = Math.max((dur.durationMs / phase.durationMs) * widthPct, 1);
                      return (
                        <div
                          key={role}
                          className="h-3 rounded-sm"
                          style={{
                            width: `${agentWidthPct}%`,
                            backgroundColor: agentMeta?.color || '#666',
                          }}
                          title={`${agentMeta?.name || role}: ${formatDuration(dur.durationMs)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-zinc-800">
          {Object.entries(AGENT_ROLE_META).map(([role, meta]) => (
            <div key={role} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: meta.color }} />
              <span className="text-[10px] text-zinc-500">{meta.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Agent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Agent</th>
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center">Status</th>
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center">Tasks</th>
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center">Artifacts</th>
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center">Messages</th>
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center">Est. Hours</th>
                <th className="pb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {analytics.agentPerformance.map((agent) => {
                const meta = AGENT_ROLE_META[agent.role as AgentRole];
                return (
                  <tr key={agent.agentId} className="hover:bg-zinc-800/30">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span>{meta?.emoji}</span>
                        <span className="text-xs text-zinc-300">{meta?.name || agent.role}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        agent.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                        agent.status === 'working' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-xs text-zinc-400">
                      {agent.tasksCompleted}/{agent.tasksTotal}
                    </td>
                    <td className="py-2.5 text-center text-xs text-zinc-400">{agent.artifactsCreated}</td>
                    <td className="py-2.5 text-center text-xs text-zinc-400">{agent.messagesCount}</td>
                    <td className="py-2.5 text-center text-xs text-zinc-400">{agent.estimatedHours}h</td>
                    <td className="py-2.5 text-right text-xs text-zinc-400">
                      {agent.totalDurationMs > 0 ? formatDuration(agent.totalDurationMs) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Task Distribution</h3>
          <div className="space-y-2">
            {Object.entries(analytics.taskBreakdown).map(([status, count]) => {
              const total = analytics.totals.tasks || 1;
              const pct = Math.round((count / total) * 100);
              const statusColors: Record<string, string> = {
                backlog: '#71717a',
                todo: '#3b82f6',
                in_progress: '#f59e0b',
                review: '#8b5cf6',
                done: '#10b981',
              };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-20 capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: statusColors[status] || '#666' }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Artifact Types</h3>
          <div className="space-y-2">
            {Object.entries(analytics.artifactBreakdown).map(([type, count]) => {
              const colorClass = ARTIFACT_COLORS[type as ArtifactType] || 'text-zinc-400 bg-zinc-500/10';
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${colorClass}`}>
                    {ARTIFACT_TYPE_LABELS[type as ArtifactType] || type}
                  </span>
                  <span className="text-xs text-zinc-400 ml-auto">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
