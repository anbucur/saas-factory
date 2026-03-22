import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Agent, AgentStatus } from '../../../types';
import { AGENT_ROLE_META } from '../../../types';
import { AgentRobot } from '../../agents/AgentRobot';
import { ThinkingBubble } from './ThinkingBubble';
import { cn } from '../../../lib/utils';

interface AgentNodeProps {
  agent: Agent;
  onClick?: () => void;
  compact?: boolean;
}

const STATUS_STYLES: Record<AgentStatus, { ring: string; glow: string; pulse: boolean }> = {
  idle: { ring: 'ring-zinc-600', glow: '', pulse: false },
  thinking: { ring: 'ring-amber-500', glow: 'shadow-amber-500/30', pulse: true },
  working: { ring: 'ring-blue-500', glow: 'shadow-blue-500/30', pulse: true },
  reviewing: { ring: 'ring-purple-500', glow: 'shadow-purple-500/30', pulse: true },
  blocked: { ring: 'ring-red-500', glow: 'shadow-red-500/30', pulse: true },
  done: { ring: 'ring-emerald-500', glow: 'shadow-emerald-500/20', pulse: false },
};

export const AgentNode = memo(function AgentNode({ agent, onClick, compact = false }: AgentNodeProps) {
  const [showBubble, setShowBubble] = useState(true);
  const meta = AGENT_ROLE_META[agent.role];
  const statusStyle = STATUS_STYLES[agent.status];
  const isActive = agent.status === 'thinking' || agent.status === 'working' || agent.status === 'reviewing';

  if (compact) {
    return (
      <motion.div
        onClick={onClick}
        className={cn(
          'relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all',
          'hover:bg-zinc-800/50'
        )}
        whileHover={{ scale: 1.05 }}
        title={`${meta.title}: ${meta.name}\nStatus: ${agent.status}\n${agent.currentTask || ''}`}
      >
        <div className={cn(
          'w-10 h-10 rounded-full ring-2 flex items-center justify-center bg-zinc-900',
          statusStyle.ring,
          isActive && 'shadow-lg',
          statusStyle.glow
        )}>
          <AgentRobot role={agent.role} status={agent.status} size={32} />
        </div>
        <span className="text-[10px] text-zinc-500 mt-1">{meta.title}</span>
        {agent.status === 'idle' && (
          <span className="absolute -top-0.5 -right-0.5 text-[8px]">😴</span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all',
        'bg-zinc-900/80 border border-zinc-800',
        'hover:border-zinc-700 hover:bg-zinc-900',
        isActive && 'border-zinc-700'
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setShowBubble(true)}
      onMouseLeave={() => setShowBubble(false)}
    >
      <ThinkingBubble task={agent.currentTask} visible={isActive && showBubble} />

      <div className="relative">
        <motion.div
          className={cn(
            'w-16 h-16 rounded-full ring-3 flex items-center justify-center bg-zinc-950',
            statusStyle.ring,
            isActive && 'shadow-lg',
            statusStyle.glow
          )}
          style={{
            boxShadow: isActive ? `0 0 20px ${meta.color}40` : undefined,
          }}
          animate={statusStyle.pulse ? {
            boxShadow: [
              `0 0 10px ${meta.color}20`,
              `0 0 25px ${meta.color}40`,
              `0 0 10px ${meta.color}20`,
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <AgentRobot role={agent.role} status={agent.status} size={48} />
        </motion.div>

        {isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
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
      </div>

      <div className="mt-2 text-center">
        <div className="text-[10px] font-medium text-zinc-500">{meta.title}</div>
        <div className="text-xs font-semibold text-zinc-300">{meta.name}</div>
      </div>

      <div className="w-full mt-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-zinc-500">{agent.status}</span>
          <span className="text-zinc-400">{agent.progress}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
});
