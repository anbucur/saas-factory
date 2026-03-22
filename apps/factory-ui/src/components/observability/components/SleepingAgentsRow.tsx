import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from '../../../types';
import { AgentNode } from './AgentNode';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SleepingAgentsRowProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export const SleepingAgentsRow = memo(function SleepingAgentsRow({ agents, onAgentClick }: SleepingAgentsRowProps) {
  const [expanded, setExpanded] = useState(false);
  
  const sleepingAgents = useMemo(() => 
    agents.filter(a => a.status === 'idle' || a.status === 'done' || a.status === 'blocked'),
    [agents]
  );

  if (sleepingAgents.length === 0) return null;

  return (
    <motion.div 
      className="border-t border-zinc-800/50"
      layout
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-800/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span>😴</span>
          <span>{sleepingAgents.length} sleeping agent{sleepingAgents.length > 1 ? 's' : ''}</span>
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-4 justify-center bg-zinc-900/30">
              {sleepingAgents.map((agent) => (
                <AgentNode
                  key={agent.id}
                  agent={agent}
                  onClick={() => onAgentClick?.(agent)}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
