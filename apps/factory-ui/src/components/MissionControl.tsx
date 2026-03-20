/**
 * Mission Control - Main workflow visualization
 * 
 * Shows:
 * - Current workflow step (step-by-step)
 * - Pixel agents that move and interact
 * - Sprint/task management
 * - Real-time progress
 */

import { useState } from 'react'
import { useFactoryStore } from '../store/factoryStore'
import { PixelAgent } from './PixelAgent'
import { SprintBoard } from './SprintBoard'
import { AgentChat } from './AgentChat'

export function MissionControl() {
  const { project, agents, resetProject } = useFactoryStore()
  const [activeView, setActiveView] = useState<'workflow' | 'sprints' | 'chat'>('workflow')

  if (!project) return null

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 className="text-xl font-bold">Mission Control</h1>
            <p className="text-xs text-zinc-500">{project.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-400">Building...</span>
          </div>
          <button
            onClick={resetProject}
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            🔄 Reset
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Phases */}
        <div className="w-72 border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Development Phases</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {project.phases.map((phase, index) => (
              <div
                key={phase.id}
                className={`
                  w-full text-left p-3 rounded-lg mb-1 transition-all
                  ${phase.status === 'active' ? 'bg-indigo-600/30 border border-indigo-500/50' : ''}
                  ${phase.status === 'complete' ? 'bg-green-500/10 border border-green-500/30' : ''}
                  ${phase.status === 'locked' ? 'bg-zinc-900/50 opacity-50' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{phase.status === 'complete' ? '✅' : phase.status === 'active' ? '🔥' : '🔒'}</span>
                  <span className="text-sm font-medium">{phase.label}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Agent visualization */}
        <div className="flex-1 flex flex-col">
          {/* View tabs */}
          <div className="h-12 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
            <button
              onClick={() => setActiveView('workflow')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeView === 'workflow' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🤖 Agent View
            </button>
            <button
              onClick={() => setActiveView('sprints')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeView === 'sprints' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📋 Sprints
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeView === 'chat' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              💬 Team Chat
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {activeView === 'workflow' && (
              <div className="h-full relative">
                {/* Background grid */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
                  backgroundSize: '30px 30px',
                }} />
                
                {/* Progress line */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                  <div className="h-0.5 bg-zinc-800 mx-8 relative">
                    {/* Completed portion */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-indigo-500"
                      style={{ width: `${(project.phases.findIndex(p => p.status === 'active') / Math.max(project.phases.length - 1, 1)) * 100}%` }}
                    />
                    {/* Phase markers */}
                    {project.phases.map((phase, i) => (
                      <div
                        key={phase.id}
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all ${
                          phase.status === 'complete' ? 'bg-green-500 border-green-400' :
                          phase.status === 'active' ? 'bg-indigo-500 border-indigo-400' :
                          'bg-zinc-900 border-zinc-700'
                        }`}
                        style={{ left: `${(i / (project.phases.length - 1)) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Pixel Agents */}
                <div className="absolute inset-0">
                  {agents.map(agent => (
                    <PixelAgent key={agent.id} agent={agent} />
                  ))}
                </div>
              </div>
            )}

            {activeView === 'sprints' && <SprintBoard />}
            {activeView === 'chat' && <AgentChat />}
          </div>
        </div>

        {/* Right panel - Logs */}
        <div className="w-80 border-l border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Activity Log</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {project.logs.slice(-20).reverse().map(log => (
              <div key={log.id} className="mb-2 text-xs">
                <span className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <span className={
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warning' ? 'text-amber-400' :
                  'text-zinc-300'
                }>
                  {log.message}
                </span>
              </div>
            ))}
            {project.logs.length === 0 && (
              <p className="text-xs text-zinc-500">No activity yet...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
