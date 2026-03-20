import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useFactoryStore, AGENT_META } from '../store/factoryStore'

export function LogStream() {
  const { project } = useFactoryStore()
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [project?.logs.length])

  if (!project) return null

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-t border-zinc-800">
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Live Logs</span>
        <span className="text-xs text-zinc-500">{project.logs.length} entries</span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs"
      >
        {project.logs.length === 0 && (
          <p className="text-zinc-600 italic">Waiting for activity...</p>
        )}

        {project.logs.map((log) => {
          const meta = AGENT_META[log.agentType]
          const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-2 py-1 ${
                log.type === 'error' ? 'text-red-400' : ''
              } ${log.type === 'success' ? 'text-green-400' : ''} ${
                log.type === 'progress' ? 'text-zinc-400' : ''
              } ${log.type === 'info' ? 'text-zinc-300' : ''}`}
            >
              <span className="text-zinc-600 shrink-0">{time}</span>
              <span
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: `${meta.color}30`, color: meta.color }}
              >
                {meta.emoji}
              </span>
              <span className="flex-1 break-all">{log.message}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
