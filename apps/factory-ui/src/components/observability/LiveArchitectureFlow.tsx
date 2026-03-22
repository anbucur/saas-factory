import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import type { ProjectDetail, Agent } from '../../types';
import { useAppStore } from '../../store/store';
import { UserLayer } from './components/UserLayer';
import { APILayer } from './components/APILayer';
import { TemporalLayer } from './components/TemporalLayer';
import { ActiveAgentsPool } from './components/ActiveAgentsPool';
import { SleepingAgentsRow } from './components/SleepingAgentsRow';
import { LLMLayer } from './components/LLMLayer';
import { CodingAgentLayer } from './components/CodingAgentLayer';
import { DataLayer } from './components/DataLayer';
import { DeploymentLayer } from './components/DeploymentLayer';
import { ConnectionFlow } from './components/ConnectionFlow';
import { Activity } from 'lucide-react';
import './styles/flow-animations.css';

interface LiveArchitectureFlowProps {
  project: ProjectDetail;
  onAgentClick?: (agent: Agent) => void;
}

export const LiveArchitectureFlow = memo(function LiveArchitectureFlow({
  project,
  onAgentClick,
}: LiveArchitectureFlowProps) {
  const { wsConnected } = useAppStore();
  const [activityState, setActivityState] = useState({
    lastLLMCall: 0,
    lastFileWrite: 0,
    lastDbWrite: 0,
    lastCLIOutput: 0,
    tokensUsed: 0,
    filesCreated: 0,
    dbWrites: 0,
  });
  const [startTime] = useState(Date.now());

  const activeAgents = useMemo(
    () => project.agents.filter(a => 
      a.status === 'thinking' || a.status === 'working' || a.status === 'reviewing'
    ),
    [project.agents]
  );

  const isThinking = useMemo(
    () => project.agents.some(a => a.status === 'thinking'),
    [project.agents]
  );

  const isCLIActive = useMemo(
    () => project.agents.some(a => 
      (a.role === 'frontend_dev' || a.role === 'backend_dev' || a.role === 'qa') &&
      a.status === 'working'
    ),
    [project.agents]
  );

  const currentCLIProvider = useMemo(() => {
    const codingAgent = project.agents.find(a => 
      (a.role === 'frontend_dev' || a.role === 'backend_dev' || a.role === 'qa') &&
      a.status === 'working'
    );
    return codingAgent ? 'opencode' as const : 'opencode' as const;
  }, [project.agents]);

  const currentTask = useMemo(() => {
    const activeAgent = project.agents.find(a => 
      a.status === 'working' && a.currentTask
    );
    return activeAgent?.currentTask || null;
  }, [project.agents]);

  const elapsed = Date.now() - startTime;

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityState(prev => ({
        ...prev,
        tokensUsed: prev.tokensUsed + (isThinking ? Math.floor(Math.random() * 100) : 0),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isThinking]);

  const handleAgentClick = useCallback((agent: Agent) => {
    onAgentClick?.(agent);
  }, [onAgentClick]);

  const fileCount = project.generatedFiles?.length || 0;
  const totalSize = useMemo(() => 
    project.generatedFiles?.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) || 0,
    [project.generatedFiles]
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">System Architecture</h2>
          <span className="text-xs text-zinc-500">Live View</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {wsConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <UserLayer wsConnected={wsConnected} />
        
        <ConnectionFlow active={wsConnected} color="blue" />
        
        <APILayer />
        
        <ConnectionFlow active={project.status === 'in_progress'} color="purple" />
        
        <TemporalLayer 
          phase={project.currentPhase}
          projectName={project.name}
          status={project.status}
          duration={elapsed}
        />

        <ConnectionFlow active={activeAgents.length > 0} color="cyan" />

        <div className="border border-zinc-800 rounded-xl bg-zinc-900/30">
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Active Agents ({activeAgents.length})
            </span>
          </div>
          <div className="p-4 pt-12">
            <ActiveAgentsPool 
              agents={project.agents} 
              onAgentClick={handleAgentClick}
            />
          </div>
          <SleepingAgentsRow 
            agents={project.agents}
            onAgentClick={handleAgentClick}
          />
        </div>

        <div className="flex gap-4 justify-center">
          <div className="flex-1 max-w-xs">
            <ConnectionFlow active={isThinking} color="amber" />
            <LLMLayer 
              thinking={isThinking}
              tokensUsed={activityState.tokensUsed}
              lastCall={activityState.lastLLMCall}
            />
          </div>
          
          <div className="flex-1 max-w-xs">
            <ConnectionFlow active={isCLIActive} color="green" />
            <CodingAgentLayer
              active={isCLIActive}
              provider={currentCLIProvider}
              task={currentTask}
              filesCreated={activityState.filesCreated}
              duration={0}
            />
          </div>
        </div>

        <ConnectionFlow 
          active={activityState.lastFileWrite > 0 || activityState.lastDbWrite > 0} 
          color="cyan" 
        />
        
        <DataLayer
          fileCount={fileCount}
          totalSize={totalSize}
          dbWrites={project.tasks?.length || 0}
          lastFileWrite={activityState.lastFileWrite}
          lastDbWrite={activityState.lastDbWrite}
        />

        <ConnectionFlow 
          active={project.deployments?.some(d => d.status === 'running')} 
          color="green" 
        />
        
        <DeploymentLayer deployments={project.deployments || []} />
      </div>
    </div>
  );
});
