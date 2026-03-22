import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from '../../../types';
import { AgentNode } from './AgentNode';

interface ActiveAgentsPoolProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export const ActiveAgentsPool = memo(function ActiveAgentsPool({ agents, onAgentClick }: ActiveAgentsPoolProps) {
  const activeAgents = useMemo(() => 
    agents.filter(a => a.status === 'thinking' || a.status === 'working' || a.status === 'reviewing'),
    [agents]
  );

  if (activeAgents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        <span className="flex items-center gap-2">
          <span className="text-lg">💤</span>
          No active agents
        </span>
      </div>
    );
  }

  return (
    <motion.div 
      className="flex flex-wrap gap-4 justify-center"
      layout
    >
      <AnimatePresence mode="popLayout">
        {activeAgents.map((agent) => (
          <motion.div
            key={agent.id}
            layout
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <AgentNode agent={agent} onClick={() => onAgentClick?.(agent)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
});
