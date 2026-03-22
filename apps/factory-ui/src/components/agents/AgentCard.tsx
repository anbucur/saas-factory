import { motion, AnimatePresence } from 'framer-motion';
import type { AgentRole, AgentStatus } from '../../types';
import { AGENT_ROLE_META } from '../../types';
import { AgentRobot } from './AgentRobot';
import { orbPulse } from '../../lib/animations';

interface AgentCardProps {
  role: AgentRole;
  status: AgentStatus;
  progress: number;
  currentTask: string | null;
  onClick?: () => void;
  isExpanded?: boolean;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; ringClass: string; glowIntensity: number }> = {
  idle: { label: 'Idle', ringClass: 'ring-zinc-600', glowIntensity: 0.3 },
  thinking: { label: 'Thinking', ringClass: 'ring-amber-500', glowIntensity: 0.6 },
  working: { label: 'Working', ringClass: 'ring-blue-500', glowIntensity: 0.8 },
  reviewing: { label: 'Reviewing', ringClass: 'ring-purple-500', glowIntensity: 0.7 },
  blocked: { label: 'Blocked', ringClass: 'ring-red-500', glowIntensity: 0.5 },
  done: { label: 'Done', ringClass: 'ring-emerald-500', glowIntensity: 0.4 },
};

export function AgentCard({ role, status, progress, currentTask, onClick, isExpanded }: AgentCardProps) {
  const meta = AGENT_ROLE_META[role];
  const config = STATUS_CONFIG[status];
  const isActive = status === 'thinking' || status === 'working' || status === 'reviewing';

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-4 rounded-2xl
        bg-zinc-900/80 border border-zinc-800 
        cursor-pointer transition-all duration-300
        hover:border-zinc-700 hover:bg-zinc-900
        ${isExpanded ? 'col-span-2 row-span-2' : ''}
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative">
        <motion.div
          className={`
            absolute inset-0 rounded-full blur-xl
          `}
          style={{ backgroundColor: meta.color }}
          variants={orbPulse}
          initial="idle"
          animate={status}
        />
        
        <div
          className={`
            relative w-20 h-20 rounded-full 
            ring-4 ${config.ringClass}
            flex items-center justify-center
            bg-zinc-950
          `}
          style={{
            boxShadow: `0 0 ${20 * config.glowIntensity}px ${meta.color}${Math.round(config.glowIntensity * 80).toString(16).padStart(2, '0')}`,
          }}
        >
          <motion.div
            className="absolute inset-1 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${meta.color}40, transparent 70%)`,
            }}
            animate={isActive ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <AgentRobot role={role} status={status} size={48} />
        </div>

        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4"
            >
              <span className="relative flex h-full w-full">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: meta.color }}
                />
                <span
                  className="relative inline-flex rounded-full h-full w-full"
                  style={{ backgroundColor: meta.color }}
                />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-center">
        <div className="text-xs font-medium text-zinc-400">{meta.title}</div>
        <div className="text-sm font-semibold text-white mt-0.5">{meta.name}</div>
      </div>

      <div className="w-full mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-500">{config.label}</span>
          <span className="text-zinc-400">{progress}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <AnimatePresence>
        {currentTask && isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mt-3"
          >
            <div className="text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-2 truncate">
              {currentTask}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
