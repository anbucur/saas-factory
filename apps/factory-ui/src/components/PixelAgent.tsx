/**
 * PixelAgent - Animated character that moves around the workflow
 */

import { useEffect, useState } from 'react'
import type { PixelAgent as PixelAgentType } from '../store/missionControlStore'

interface PixelAgentProps {
  agent: PixelAgentType
}

// Simple pixel art characters
const AGENT_SPRITES: Record<string, string[]> = {
  pm: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██████ ',
    ' ██  ██ ',
  ],
  ba1: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██████ ',
    ' ██████ ',
  ],
  ba2: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██████ ',
    ' ██  ██ ',
  ],
  architect: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██▓███ ',
    '  ████  ',
    ' ████  ██',
    ' ██████████',
  ],
  dev1: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██░░██ ',
    ' █░░░█ ',
  ],
  dev2: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██░░██ ',
    ' █░░░█ ',
  ],
  qa1: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██████ ',
    ' ░░░░░ ',
  ],
  qa2: [
    '  ████  ',
    ' ██████ ',
    ' █◐██◐█ ',
    ' ██████ ',
    '  ████  ',
    ' ██████ ',
    ' ░░░░░ ',
  ],
}

export function PixelAgent({ agent }: PixelAgentProps) {
  const [bounce, setBounce] = useState(false)

  // Bounce animation when working
  useEffect(() => {
    if (agent.status === 'working') {
      const interval = setInterval(() => {
        setBounce(b => !b)
      }, 300)
      return () => clearInterval(interval)
    } else {
      setBounce(false)
    }
  }, [agent.status])

  // Talking animation
  useEffect(() => {
    if (agent.status === 'talking') {
      const interval = setInterval(() => {
        // Just animate - don't need to track frame
      }, 200)
      }, 200)
      return () => clearInterval(interval)
    }
  }, [agent.status])

  const sprite = AGENT_SPRITES[agent.role] || AGENT_SPRITES.dev1

  return (
    <div
      className="absolute transition-all duration-1000 ease-out"
      style={{
        left: `${agent.x}%`,
        top: `${agent.y}%`,
        transform: `translate(-50%, -50%) ${bounce ? 'translateY(-3px)' : ''}`,
      }}
    >
      {/* Agent body - pixel art style */}
      <div 
        className={`
          relative 
          ${agent.status === 'done' ? 'opacity-60' : ''}
          ${agent.status === 'working' ? 'animate-pulse' : ''}
        `}
      >
        {/* Pixel art character */}
        <div className="relative">
          {/* Main body */}
          <div 
            className="relative"
            style={{
              display: 'grid',
              gridTemplateRows: `repeat(${sprite.length}, 6px)`,
              gap: '1px',
            }}
          >
            {sprite.map((row, y) => (
              <div key={y} className="flex gap-[1px]">
                {row.split('').map((char, x) => {
                  if (char === ' ') return <div key={x} className="w-1.5 h-1.5" />
                  if (char === '█') return (
                    <div 
                      key={x} 
                      className="w-1.5 h-1.5 rounded-sm"
                      style={{ backgroundColor: agent.color }}
                    />
                  )
                  if (char === '◐') {
                    // Eyes - change based on status
                    const eyeColor = agent.status === 'working' ? '#22c55e' : agent.status === 'talking' ? '#f59e0b' : agent.status === 'done' ? '#6b7280' : '#fff'
                    return (
                      <div 
                        key={x} 
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ 
                          backgroundColor: eyeColor,
                          boxShadow: eyeColor !== '#6b7280' ? `0 0 4px ${eyeColor}` : 'none',
                        }}
                      />
                    )
                  }
                  if (char === '▓') {
                    // Highlight
                    return (
                      <div 
                        key={x} 
                        className="w-1.5 h-1.5"
                        style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                      />
                    )
                  }
                  if (char === '░') {
                    // Shadow/detail
                    return (
                      <div 
                        key={x} 
                        className="w-1.5 h-1.5"
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                      />
                    )
                  }
                  return <div key={x} className="w-1.5 h-1.5" />
                })}
              </div>
            ))}
          </div>

          {/* Speech bubble when talking */}
          {agent.status === 'talking' && (
            <div 
              className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-zinc-900 text-xs px-2 py-1 rounded-lg whitespace-nowrap animate-bounce"
            >
              💬
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
            </div>
          )}

          {/* Working indicator */}
          {agent.status === 'working' && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          )}

          {/* Done checkmark */}
          {agent.status === 'done' && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              ✓
            </div>
          )}
        </div>

        {/* Name tag */}
        <div className="mt-1 text-center">
          <span 
            className="text-[8px] px-1 py-0.5 rounded"
            style={{ backgroundColor: `${agent.color}40`, color: agent.color }}
          >
            {agent.emoji} {agent.name.split(' ')[0]}
          </span>
        </div>

        {/* Task tooltip */}
        {agent.currentTask && (agent.status === 'working' || agent.status === 'talking') && (
          <div 
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10"
          >
            {agent.currentTask}
          </div>
        )}
      </div>
    </div>
  )
}
