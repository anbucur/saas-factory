import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from '../../types';
import { AGENT_ROLE_META, PHASE_META, type AgentStatus } from '../../types';
import { AgentRobot } from './AgentRobot';
import { scaleIn, fadeInUp } from '../../lib/animations';

interface AgentDetailProps {
  agent: Agent | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; icon: string }> = {
  idle: { label: 'Idle', color: 'text-zinc-400', icon: '○' },
  thinking: { label: 'Thinking', color: 'text-amber-400', icon: '◐' },
  working: { label: 'Working', color: 'text-blue-400', icon: '●' },
  reviewing: { label: 'Reviewing', color: 'text-purple-400', icon: '◉' },
  blocked: { label: 'Blocked', color: 'text-red-400', icon: '⊘' },
  done: { label: 'Completed', color: 'text-emerald-400', icon: '✓' },
};

export function AgentDetail({ agent, onClose }: AgentDetailProps) {
  if (!agent) return null;

  const meta = AGENT_ROLE_META[agent.role];
  const statusConfig = STATUS_CONFIG[agent.status];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${meta.color}, transparent 50%)`,
            }}
          />

          <div className="relative p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-start gap-6">
              <div
                className="relative p-1 rounded-2xl"
                style={{ boxShadow: `0 0 30px ${meta.color}40` }}
              >
                <div className="bg-zinc-950 rounded-xl p-4">
                  <AgentRobot role={agent.role} status={agent.status} size={80} />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{meta.name}</h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} bg-current/10`}
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    {statusConfig.icon} {statusConfig.label}
                  </span>
                </div>
                <p className="text-zinc-400 mt-1">{meta.emoji} {meta.title}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-500">Progress</span>
                    <span className="text-white font-medium">{agent.progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: meta.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {agent.currentTask && (
              <motion.div
                className="mt-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Current Task</div>
                <p className="text-white">{agent.currentTask}</p>
              </motion.div>
            )}

            <motion.div
              className="mt-6 grid grid-cols-2 gap-4"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <div className="p-4 bg-zinc-800/30 rounded-xl">
                <div className="text-xs text-zinc-500 mb-1">Phase</div>
                <div className="text-white font-medium">
                  {PHASE_META[agent.role === 'pm' ? 'requirements' : 'development']?.label || 'Active'}
                </div>
              </div>
              <div className="p-4 bg-zinc-800/30 rounded-xl">
                <div className="text-xs text-zinc-500 mb-1">Status Since</div>
                <div className="text-white font-medium">
                  {new Date(agent.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="mt-6 p-4 bg-zinc-800/30 rounded-xl"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Capabilities</div>
              <div className="flex flex-wrap gap-2">
                {['Analysis', 'Planning', 'Coordination', 'Review', 'Documentation'].map((cap) => (
                  <span
                    key={cap}
                    className="px-3 py-1 text-xs rounded-full bg-zinc-700/50 text-zinc-300"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
