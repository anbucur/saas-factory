import { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Box, Globe, Server, RefreshCw, Square, Trash2,
  CheckCircle, XCircle, Clock, Loader2, ExternalLink,
  FileText, Heart, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { ProjectDetail, Deployment, DeploymentOption, StackInfo, DeploymentStatus } from '../../types';

interface DeploymentViewProps {
  project: ProjectDetail;
}

const STATUS_CONFIG: Record<DeploymentStatus, { label: string; color: string; icon: typeof CheckCircle; animate?: boolean }> = {
  pending: { label: 'Pending', color: 'text-zinc-400', icon: Clock },
  building: { label: 'Building', color: 'text-amber-400', icon: Loader2, animate: true },
  deploying: { label: 'Deploying', color: 'text-blue-400', icon: Loader2, animate: true },
  running: { label: 'Running', color: 'text-emerald-400', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircle },
  stopped: { label: 'Stopped', color: 'text-zinc-500', icon: Square },
  obsolete: { label: 'Obsolete', color: 'text-zinc-600', icon: Trash2 },
};

const STRATEGY_ICONS: Record<string, typeof Box> = {
  docker: Box,
  vercel: Globe,
  static: Server,
};

export function DeploymentView({ project }: DeploymentViewProps) {
  const [options, setOptions] = useState<DeploymentOption[]>([]);
  const [stack, setStack] = useState<StackInfo | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>(project.deployments || []);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [healthChecks, setHealthChecks] = useState<Record<string, { healthy: boolean; details: string }>>({});

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const data = await api.getDeploymentOptions(project.id);
      setOptions(data.options);
      setStack(data.stack);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingOptions(false);
    }
  }, [project.id]);

  const loadDeployments = useCallback(async () => {
    try {
      const data = await api.getDeployments(project.id);
      setDeployments(data);
    } catch { /* silent */ }
  }, [project.id]);

  useEffect(() => {
    loadOptions();
    loadDeployments();

    // Poll for updates while any deployment is building/deploying
    const interval = setInterval(() => {
      loadDeployments();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadOptions, loadDeployments]);

  async function handleDeploy(strategy: string) {
    try {
      setDeploying(true);
      setError(null);
      await api.deployProject(project.id, strategy);
      // Reload deployments after a short delay
      setTimeout(loadDeployments, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  }

  async function handleStop(deploymentId: string) {
    try {
      await api.stopDeployment(project.id, deploymentId);
      loadDeployments();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCleanup() {
    try {
      const { removed } = await api.cleanupDeployments(project.id);
      loadDeployments();
      if (removed > 0) {
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleHealthCheck(deploymentId: string) {
    try {
      const health = await api.checkDeploymentHealth(project.id, deploymentId);
      setHealthChecks(prev => ({ ...prev, [deploymentId]: health }));
    } catch {
      setHealthChecks(prev => ({ ...prev, [deploymentId]: { healthy: false, details: 'Health check failed' } }));
    }
  }

  async function toggleLogs(deploymentId: string) {
    if (expandedLogs === deploymentId) {
      setExpandedLogs(null);
      return;
    }
    setExpandedLogs(deploymentId);
  }

  const runningDeployments = deployments.filter(d => d.status === 'running');
  const otherDeployments = deployments.filter(d => d.status !== 'running');
  const hasObsolete = deployments.some(d => d.status === 'obsolete' || d.status === 'stopped');

  return (
    <div className="p-6 space-y-6">
      {/* Stack Detection Summary */}
      {stack && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            Detected Stack
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stack.framework && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Framework</div>
                <div className="text-sm text-white font-medium capitalize">{stack.framework}</div>
              </div>
            )}
            {stack.language && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Language</div>
                <div className="text-sm text-white font-medium capitalize">{stack.language}</div>
              </div>
            )}
            {stack.runtime && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Runtime</div>
                <div className="text-sm text-white font-medium capitalize">{stack.runtime}</div>
              </div>
            )}
            {stack.databaseType && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Database</div>
                <div className="text-sm text-white font-medium capitalize">{stack.databaseType}</div>
              </div>
            )}
            {stack.frontendFramework && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Frontend</div>
                <div className="text-sm text-white font-medium capitalize">{stack.frontendFramework}</div>
              </div>
            )}
            {stack.backendFramework && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Backend</div>
                <div className="text-sm text-white font-medium capitalize">{stack.backendFramework}</div>
              </div>
            )}
            {stack.packageManager && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Package Manager</div>
                <div className="text-sm text-white font-medium">{stack.packageManager}</div>
              </div>
            )}
            {stack.isMonorepo && (
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Structure</div>
                <div className="text-sm text-white font-medium">Monorepo</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Deployment Options */}
      {!loadingOptions && options.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Deploy Your Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {options.map((option) => {
              const Icon = STRATEGY_ICONS[option.strategy] || Box;
              return (
                <div
                  key={option.strategy}
                  className={`relative bg-zinc-900 border rounded-xl p-4 transition-all ${
                    option.recommended
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {option.recommended && (
                    <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] font-medium text-emerald-400">
                      Recommended
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2 mt-1">
                    <div className={`p-2 rounded-lg ${option.recommended ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                      <Icon className={`w-5 h-5 ${option.recommended ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{option.label}</div>
                      <div className="text-[10px] text-zinc-500">{option.estimatedTime}</div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{option.description}</p>

                  {option.requirements.length > 0 && (
                    <div className="mb-3 flex items-center gap-1.5 text-[10px] text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      {option.requirements[0]}
                    </div>
                  )}

                  <button
                    onClick={() => handleDeploy(option.strategy)}
                    disabled={deploying || option.requirements.length > 0}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      option.requirements.length > 0
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        : option.recommended
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {deploying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</>
                    ) : (
                      <><Rocket className="w-4 h-4" /> Deploy</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loadingOptions && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          <span className="ml-2 text-sm text-zinc-500">Analyzing project stack...</span>
        </div>
      )}

      {/* Running Deployments */}
      {runningDeployments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Active Deployments
            </h3>
          </div>
          <div className="space-y-3">
            {runningDeployments.map((dep) => (
              <DeploymentCard
                key={dep.id}
                deployment={dep}
                onStop={handleStop}
                onRedeploy={handleDeploy}
                onHealthCheck={handleHealthCheck}
                onToggleLogs={toggleLogs}
                expandedLogs={expandedLogs === dep.id}
                healthCheck={healthChecks[dep.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Deployments */}
      {otherDeployments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400">Deployment History</h3>
            {hasObsolete && (
              <button
                onClick={handleCleanup}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clean Up
              </button>
            )}
          </div>
          <div className="space-y-2">
            {otherDeployments.map((dep) => (
              <DeploymentCard
                key={dep.id}
                deployment={dep}
                onStop={handleStop}
                onRedeploy={handleDeploy}
                onHealthCheck={handleHealthCheck}
                onToggleLogs={toggleLogs}
                expandedLogs={expandedLogs === dep.id}
                healthCheck={healthChecks[dep.id]}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {deployments.length === 0 && !loadingOptions && options.length === 0 && (
        <div className="text-center py-16">
          <Rocket className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No Deployments Yet</h3>
          <p className="text-sm text-zinc-600 max-w-md mx-auto">
            Complete the build process first. Once your project code is generated, deployment options will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function DeploymentCard({
  deployment,
  onStop,
  onRedeploy,
  onHealthCheck,
  onToggleLogs,
  expandedLogs,
  healthCheck,
  compact = false,
}: {
  deployment: Deployment;
  onStop: (id: string) => void;
  onRedeploy: (strategy: string) => void;
  onHealthCheck: (id: string) => void;
  onToggleLogs: (id: string) => void;
  expandedLogs: boolean;
  healthCheck?: { healthy: boolean; details: string };
  compact?: boolean;
}) {
  const statusConfig = STATUS_CONFIG[deployment.status];
  const StatusIcon = statusConfig.icon;
  const StrategyIcon = STRATEGY_ICONS[deployment.strategy] || Box;

  const createdAt = new Date(deployment.createdAt).toLocaleString();

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${compact ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800">
              <StrategyIcon className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white capitalize">{deployment.strategy}</span>
                <span className="text-[10px] text-zinc-600">v{deployment.version}</span>
                <span className={`flex items-center gap-1 text-xs ${statusConfig.color}`}>
                  <StatusIcon className={`w-3 h-3 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                  {statusConfig.label}
                </span>
              </div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{createdAt}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deployment.url && deployment.status === 'running' && (
              <a
                href={deployment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </a>
            )}

            {deployment.status === 'running' && (
              <>
                <button
                  onClick={() => onHealthCheck(deployment.id)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Health Check"
                >
                  <Heart className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRedeploy(deployment.strategy)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Redeploy"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onStop(deployment.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {deployment.status === 'failed' && (
              <button
                onClick={() => onRedeploy(deployment.strategy)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}

            <button
              onClick={() => onToggleLogs(deployment.id)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="View Logs"
            >
              {expandedLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* URL display for running deployments */}
        {deployment.url && deployment.status === 'running' && (
          <div className="mt-2 flex items-center gap-2 pl-11">
            <span className="text-xs text-zinc-500">URL:</span>
            <code className="text-xs text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded">{deployment.url}</code>
          </div>
        )}

        {/* Health check result */}
        {healthCheck && (
          <div className={`mt-2 pl-11 flex items-center gap-2 text-xs ${healthCheck.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
            {healthCheck.healthy ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {healthCheck.details}
          </div>
        )}

        {/* Port display */}
        {deployment.port && (
          <div className="mt-1 pl-11 flex items-center gap-2 text-[10px] text-zinc-600">
            Port: {deployment.port}
            {deployment.containerId && <span>| Container: {deployment.containerId}</span>}
          </div>
        )}
      </div>

      {/* Expanded logs */}
      {expandedLogs && (
        <div className="border-t border-zinc-800">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Build Log</span>
            </div>
            <pre className="text-[10px] text-zinc-400 bg-zinc-950 rounded-lg p-3 max-h-60 overflow-auto whitespace-pre-wrap font-mono">
              {deployment.buildLog || 'No build log available'}
            </pre>

            {deployment.errorLog && (
              <>
                <div className="flex items-center gap-2 mt-3 mb-2">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Error Log</span>
                </div>
                <pre className="text-[10px] text-red-400 bg-red-500/5 rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap font-mono">
                  {deployment.errorLog}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
