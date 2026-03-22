import { motion } from 'framer-motion';
import type { Agent } from '../../types';
import { AgentCard } from './AgentCard';
import { staggerContainer, staggerItem } from '../../lib/animations';

interface AgentGridProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  selectedAgentId?: string | null;
}

const AGENT_ORDER = ['pm', 'ba', 'architect', 'frontend_dev', 'backend_dev', 'qa', 'devops'] as const;

export function AgentGrid({ agents, onAgentClick, selectedAgentId }: AgentGridProps) {
  const sortedAgents = AGENT_ORDER.map(role => 
    agents.find(a => a.role === role)
  ).filter(Boolean) as Agent[];

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {sortedAgents.map((agent) => (
        <motion.div key={agent.id} variants={staggerItem}>
          <AgentCard
            role={agent.role}
            status={agent.status}
            progress={agent.progress}
            currentTask={agent.currentTask}
            onClick={() => onAgentClick?.(agent)}
            isExpanded={selectedAgentId === agent.id}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
