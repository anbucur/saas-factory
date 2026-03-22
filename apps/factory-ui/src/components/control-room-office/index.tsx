import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/store';
import { OfficeFloor } from './locations/OfficeFloor';
import { CharacterLayer } from './CharacterLayer';
import { MiniMap } from './effects/MiniMap';
import { FLOOR_SIZE } from './data/layoutPositions';
import { PHASE_META, AGENT_ROLE_META } from '../../types';

export function ControlRoomOffice() {
  const currentProject = useAppStore((s) => s.currentProject);
  const wsConnected = useAppStore((s) => s.wsConnected);

  const activeAgents = useMemo(() => {
    if (!currentProject) return 0;
    return currentProject.agents.filter(
      (a) => a.status === 'thinking' || a.status === 'working' || a.status === 'reviewing'
    ).length;
  }, [currentProject?.agents]);

  const totalProgress = useMemo(() => {
    if (!currentProject || currentProject.agents.length === 0) return 0;
    return Math.round(
      currentProject.agents.reduce((sum, a) => sum + a.progress, 0) /
        currentProject.agents.length
    );
  }, [currentProject?.agents]);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400">
        No project loaded
      </div>
    );
  }

  const phaseInfo = PHASE_META[currentProject.currentPhase];

  return (
    <div className="relative bg-zinc-950 rounded-2xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-cyan-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-zinc-300">
              {currentProject.name}
            </span>
          </div>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: `${phaseInfo?.color}20`,
              color: phaseInfo?.color,
            }}
          >
            {phaseInfo?.label}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Active</span>
            <span className="text-sm font-bold text-cyan-400">{activeAgents}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Progress</span>
            <span className="text-sm font-bold text-white">{totalProgress}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Agents</span>
            <span className="text-sm font-bold text-white">
              {currentProject.agents.length}
            </span>
          </div>
        </div>
      </div>

      <div
        className="pt-14 flex items-center justify-center"
        style={{ height: FLOOR_SIZE.height + 50 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <OfficeFloor />
            <CharacterLayer className="absolute inset-0" />
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-zinc-800">
        <div className="text-[10px] text-zinc-500 mb-1">LEGEND</div>
        <div className="flex gap-3">
          {Object.entries(AGENT_ROLE_META).slice(0, 4).map(([role, meta]) => (
            <div key={role} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="text-[9px] text-zinc-400">{meta.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <MiniMap />
      </div>
    </div>
  );
}

export default ControlRoomOffice;
