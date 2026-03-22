import { motion } from 'framer-motion';
import { Wifi, WifiOff, Volume2, VolumeX, Activity, Zap } from 'lucide-react';
import type { ProjectPhase, ProjectStatus } from '../../types';
import { PHASE_META, PHASE_ORDER } from '../../types';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface HUDHeaderProps {
  projectName: string;
  status: ProjectStatus;
  currentPhase: ProjectPhase;
  wsConnected: boolean;
  activeAgentsCount: number;
  totalProgress: number;
}

export function HUDHeader({
  projectName,
  status,
  currentPhase,
  wsConnected,
  activeAgentsCount,
  totalProgress,
}: HUDHeaderProps) {
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEffects();
  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);

  const getStatusStyles = () => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'paused':
        return 'bg-amber-500/20 text-amber-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <header className="relative bg-zinc-900/95 border-b border-zinc-800 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
      
      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{projectName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyles()}`}>
                  {status === 'in_progress' ? 'ACTIVE' : status.toUpperCase()}
                </span>
                <span className="text-xs text-zinc-500">
                  Phase: <span className="text-zinc-300">{PHASE_META[currentPhase].label}</span>
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4 ml-6 pl-6 border-l border-zinc-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-zinc-400">
                  <span className="text-white font-medium">{activeAgentsCount}</span> agents active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-zinc-400">
                  <span className="text-white font-medium">{totalProgress}%</span> complete
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-zinc-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
            </motion.button>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                wsConnected ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
            >
              {wsConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">OFFLINE</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {PHASE_ORDER.slice(0, -1).map((phase, index) => {
            const meta = PHASE_META[phase];
            const isActive = phase === currentPhase;
            const isCompleted = index < currentPhaseIndex;
            const bgColor = isCompleted || isActive ? meta.color : '#27272a';

            return (
              <div key={phase} className="flex items-center flex-1">
                <motion.div
                  className={`relative flex-1 h-2 rounded-full overflow-hidden ${
                    isActive ? 'ring-2 ring-offset-2 ring-offset-zinc-900' : ''
                  }`}
                  style={{ backgroundColor: bgColor }}
                  animate={isActive ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-white/30"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </motion.div>
                {index < PHASE_ORDER.length - 2 && (
                  <div
                    className={`w-3 h-0.5 mx-0.5 ${index < currentPhaseIndex ? 'bg-current' : 'bg-zinc-700'}`}
                    style={{ color: PHASE_META[PHASE_ORDER[index + 1]].color }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
          {PHASE_ORDER.slice(0, -1).map((phase) => (
            <span
              key={phase}
              className={phase === currentPhase ? 'text-zinc-300 font-medium' : ''}
            >
              {PHASE_META[phase].label}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
