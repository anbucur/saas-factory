import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Maximize2, AlertCircle, LayoutGrid, Users } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { AgentGrid } from '../agents/AgentGrid';
import { AgentDetail } from '../agents/AgentDetail';
import { HUDHeader } from './HUDHeader';
import { PhasePipeline } from './PhasePipeline';
import { LiveActivityFeed } from './LiveActivityFeed';
import { 
  TasksMiniPanel, 
  ArtifactsMiniPanel, 
  ConversationsMiniPanel, 
  FilesMiniPanel 
} from './MiniPanels';
import { ParticleBackground } from '../effects/ParticleBackground';
import { ControlRoomOffice } from '../control-room-office';
import type { Agent } from '../../types';
import { staggerContainer } from '../../lib/animations';

type ViewMode = 'traditional' | 'office';

export function ControlRoom() {
  const { currentProject, wsConnected } = useAppStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('office');

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <div className="text-zinc-400 mb-2">No project loaded</div>
        <div className="text-zinc-500 text-sm mb-4">
          Select a project to view the control room
        </div>
        <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const activeAgents = currentProject.agents.filter(
    (a) => a.status === 'thinking' || a.status === 'working' || a.status === 'reviewing'
  );
  const totalProgress = currentProject.agents.length > 0
    ? Math.round(
        currentProject.agents.reduce((sum, a) => sum + a.progress, 0) / currentProject.agents.length
      )
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      <ParticleBackground count={30} color="#3b82f6" />

      <HUDHeader
        projectName={currentProject.name}
        status={currentProject.status}
        currentPhase={currentProject.currentPhase}
        wsConnected={wsConnected}
        activeAgentsCount={activeAgents.length}
        totalProgress={totalProgress}
      />

      <div className="px-6 py-3 flex items-center justify-end border-b border-zinc-800/50">
        <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('traditional')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'traditional'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Traditional
          </button>
          <button
            onClick={() => setViewMode('office')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'office'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Office View
          </button>
        </div>
      </div>

      {viewMode === 'office' ? (
        <div className="p-6">
          <ControlRoomOffice />
        </div>
      ) : (
        <main className="relative px-6 py-6">
        <motion.div
          className="grid grid-cols-12 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  Agent Orchestration
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{activeAgents.length} active</span>
                  <span>•</span>
                  <span>{currentProject.agents.filter(a => a.status === 'done').length} completed</span>
                </div>
              </div>
              <AgentGrid
                agents={currentProject.agents}
                onAgentClick={setSelectedAgent}
                selectedAgentId={selectedAgent?.id}
              />
            </div>

            <PhasePipeline currentPhase={currentProject.currentPhase} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TasksMiniPanel tasks={currentProject.tasks} />
              <ArtifactsMiniPanel artifacts={currentProject.artifacts} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConversationsMiniPanel conversations={currentProject.conversations} />
              <FilesMiniPanel files={currentProject.generatedFiles} />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              <LiveActivityFeed logs={currentProject.logs} />

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <div className="text-2xl font-bold text-white">{currentProject.tasks.length}</div>
                    <div className="text-xs text-zinc-500">Tasks</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <div className="text-2xl font-bold text-white">{currentProject.artifacts.length}</div>
                    <div className="text-xs text-zinc-500">Artifacts</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <div className="text-2xl font-bold text-white">{currentProject.conversations.length}</div>
                    <div className="text-xs text-zinc-500">Conversations</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <div className="text-2xl font-bold text-white">{currentProject.generatedFiles.length}</div>
                    <div className="text-xs text-zinc-500">Files</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/project/${currentProject.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Detail View
                </Link>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-colors">
                  <Maximize2 className="w-4 h-4" />
                  Fullscreen
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      )}

      <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </div>
  );
}
