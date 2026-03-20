import { motion } from 'framer-motion'
import type { Agent } from '../types'
import { AGENT_META } from '../store/factoryStore'

interface Props {
  agent: Agent
  x: number
  y: number
}

export function AgentCharacter({ agent, x, y }: Props) {
  const meta = AGENT_META[agent.type]
  const isWorking = agent.status === 'working'
  const isDone = agent.status === 'done'
  const isError = agent.status === 'error'

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: isDone ? 1.1 : 1,
        y: isWorking ? [0, -8, 0] : 0,
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: { duration: 1.5, repeat: isWorking ? Infinity : 0, ease: 'easeInOut' },
      }}
    >
      {/* Character body */}
      <motion.div
        className="relative"
        animate={{
          rotate: isError ? [-5, 5, -5, 5, 0] : 0,
        }}
        transition={{ duration: 0.3, repeat: isError ? Infinity : 0 }}
      >
        {/* Glow effect when working */}
        {isWorking && (
          <div
            className="absolute inset-0 rounded-full blur-md opacity-50"
            style={{ backgroundColor: meta.color }}
          />
        )}

        {/* Agent circle */}
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 relative z-10"
          style={{
            backgroundColor: `${meta.color}20`,
            borderColor: meta.color,
            boxShadow: isDone
              ? `0 0 20px ${meta.color}`
              : isWorking
              ? `0 0 15px ${meta.color}80`
              : 'none',
          }}
        >
          <span className="text-3xl">{meta.emoji}</span>

          {/* Status indicator */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{
              backgroundColor: isDone ? '#22c55e' : isError ? '#ef4444' : meta.color,
            }}
            animate={{ scale: isWorking ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.8, repeat: isWorking ? Infinity : 0 }}
          >
            {isDone ? '✓' : isError ? '!' : isWorking ? '●' : '○'}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Name label */}
      <motion.div
        className="mt-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
        style={{
          backgroundColor: `${meta.color}30`,
          color: meta.color,
        }}
      >
        {meta.label}
      </motion.div>

      {/* Progress bar when working */}
      {isWorking && (
        <div className="mt-1 w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Current task tooltip */}
      {agent.currentTask && isWorking && (
        <motion.div
          className="absolute top-full mt-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 whitespace-nowrap z-50"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {agent.currentTask.length > 30
            ? agent.currentTask.slice(0, 30) + '...'
            : agent.currentTask}
        </motion.div>
      )}
    </motion.div>
  )
}
