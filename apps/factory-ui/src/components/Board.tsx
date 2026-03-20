import { AnimatePresence, motion } from 'framer-motion'
import { useFactoryStore, ZONE_POSITIONS } from '../store/factoryStore'
import { AgentCharacter } from './AgentCharacter'
import type { PhaseId } from '../types'

const ZONE_CONFIG: Record<PhaseId, { label: string; icon: string; gradient: string }> = {
  poc: { label: 'PoC', icon: '💡', gradient: 'from-indigo-900/40 to-indigo-950/80' },
  enhance: { label: 'Enhance', icon: '✨', gradient: 'from-pink-900/40 to-pink-950/80' },
  security: { label: 'Security', icon: '🛡️', gradient: 'from-green-900/40 to-green-950/80' },
  prod: { label: 'Production', icon: '🚀', gradient: 'from-cyan-900/40 to-cyan-950/80' },
}

export function Board() {
  const { project } = useFactoryStore()

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-zinc-500">
          <div className="text-6xl mb-4">🏭</div>
          <p className="text-lg">No active project</p>
          <p className="text-sm">Start one from the panel on the right →</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden board-grid rounded-xl">
      {/* Zone columns */}
      <div className="absolute inset-0 flex">
        {project.phases.map((phase) => {
          const config = ZONE_CONFIG[phase.id]
          const isActive = phase.status === 'active'
          const isComplete = phase.status === 'complete'

          return (
            <motion.div
              key={phase.id}
              className={`flex-1 relative border-r border-zinc-800 last:border-r-0 ${
                isComplete ? 'opacity-60' : isActive ? 'opacity-100' : 'opacity-30'
              }`}
              style={{
                background: `linear-gradient(180deg, ${config.gradient.replace('from-', 'rgba(').replace('to-', '), rgba(').replace('/40', ', 0.4').replace('/80', ', 0.8)').replace('-900', '20').replace('-950', '30')})`,
              }}
            >
              {/* Zone header */}
              <motion.div
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full border"
                style={{
                  borderColor: isComplete ? '#22c55e' : isActive ? '#6366f1' : '#3f3f46',
                  backgroundColor: 'rgba(15, 17, 23, 0.8)',
                }}
                animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
              >
                <span>{config.icon}</span>
                <span
                  className={`text-sm font-medium ${
                    isComplete ? 'text-green-400' : isActive ? 'text-indigo-400' : 'text-zinc-500'
                  }`}
                >
                  {config.label}
                </span>
                {isComplete && <span className="text-green-400 text-xs">✓</span>}
              </motion.div>

              {/* Connection lines between zones */}
              {phase.id !== 'prod' && (
                <div className="absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent z-10" />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Active agents on the board */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {project.agents.map((agent) => {
            // Position agent in its phase zone with some offset per type
            const basePos = ZONE_POSITIONS[project.currentPhase]
            const agentOffsets: Record<string, { x: number; y: number }> = {
              coder: { x: -15, y: -20 },
              ui: { x: 15, y: -20 },
              security: { x: -15, y: 20 },
              billing: { x: 15, y: 0 },
              deploy: { x: 0, y: 30 },
            }
            const offset = agentOffsets[agent.type] || { x: 0, y: 0 }

            return (
              <AgentCharacter
                key={agent.id}
                agent={agent}
                x={basePos.x + offset.x}
                y={basePos.y + offset.y}
              />
            )
          })}
        </AnimatePresence>
      </div>

      {/* Center Ramses indicator */}
      <motion.div
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <span className="text-lg">🔱</span>
        <span className="text-yellow-400 text-sm font-medium">Ramses</span>
      </motion.div>

      {/* Phase progress indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-zinc-700 rounded-full">
        {project.phases.map((phase, i) => (
          <div key={phase.id} className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                phase.status === 'complete'
                  ? 'bg-green-400'
                  : phase.status === 'active'
                  ? 'bg-indigo-400 animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            {i < project.phases.length - 1 && (
              <div className="w-4 h-0.5 bg-zinc-700" />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs text-zinc-400">
          {project.phases.find((p) => p.status === 'active')?.label || 'Complete'} Phase
        </span>
      </div>
    </div>
  )
}
