/**
 * Mission Control - Main workflow visualization
 * 
 * Shows:
 * - Current workflow step (step-by-step, not all at once)
 * - Pixel agents that move and interact
 * - Sprint/task management
 * - Real-time progress
 */

import { useEffect, useState } from 'react'
import { useMissionControlStore } from '../store/missionControlStore'
import { PixelAgent } from './PixelAgent'
import { SprintBoard } from './SprintBoard'
import { AgentChat } from './AgentChat'

const WORKFLOW_STEPS = [
  { id: 'briefing', label: '📢 Briefing', description: 'PM briefs the team', duration: '2 min' },
  { id: 'requirements', label: '📝 Requirements', description: 'BAs document specs', duration: '5 min' },
  { id: 'analysis', label: '🔍 Analysis', description: 'Requirements analysis', duration: '3 min' },
  { id: 'architecture', label: '🏗️ Architecture', description: 'Tech stack & planning', duration: '5 min' },
  { id: 'development', label: '💻 Development', description: 'Building features', duration: '15 min' },
  { id: 'review', label: '👀 Code Review', description: 'Peer review', duration: '5 min' },
  { id: 'qa', label: '🧪 QA Testing', description: 'Test & fix bugs', duration: '10 min' },
  { id: 'complete', label: '✅ Complete', description: 'Ready for next phase', duration: '-' },
]

export function MissionControl() {
  const {
    currentStep,
    stepProgress,
    agents,
    sprints,
    setStep,
    completeStep,
    reset,
  } = useMissionControlStore()

  const [activeView, setActiveView] = useState<'workflow' | 'sprints' | 'chat'>('workflow')

  // Simulate workflow progress
  useEffect(() => {
    if (stepProgress < 100) {
      const timer = setTimeout(() => {
        useMissionControlStore.getState().setStep(currentStep, stepProgress + 5)
      }, 500)
      return () => clearTimeout(timer)
    } else if (currentStep !== 'complete') {
      completeStep()
    }
  }, [currentStep, stepProgress])

  const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🎮</span>
          <h1 className="text-xl font-bold">Mission Control</h1>
          <span className="text-sm text-zinc-500">|</span>
          <span className="text-sm text-zinc-400">Agile Workflow Engine</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">System Online</span>
          </div>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            🔄 Reset
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Workflow steps */}
        <div className="w-72 border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Workflow Steps</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = step.id === currentStep
              const isComplete = index < currentStepIndex
              const isPending = index > currentStepIndex
              
              return (
                <button
                  key={step.id}
                  onClick={() => isComplete || isPending ? setStep(step.id as typeof currentStep) : undefined}
                  disabled={isPending}
                  className={`
                    w-full text-left p-3 rounded-lg mb-1 transition-all
                    ${isActive ? 'bg-indigo-600/30 border border-indigo-500/50' : ''}
                    ${isComplete ? 'bg-green-500/10 border border-green-500/30' : ''}
                    ${isPending ? 'bg-zinc-900/50 opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{step.label}</span>
                    {isComplete && <span className="text-green-400 text-xs">✓</span>}
                    {isActive && (
                      <span className="ml-auto">
                        <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{step.description}</p>
                  {isActive && (
                    <div className="mt-2">
                      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${stepProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{step.duration}</p>
                    </div>
                  )}
                </button>
              )
            })}
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
                
                {/* Workflow lanes */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64">
                  {/* Lane labels */}
                  <div className="absolute left-4 top-0 text-xs text-zinc-600">STRATEGY</div>
                  <div className="absolute left-4 top-1/4 text-xs text-zinc-600">PLANNING</div>
                  <div className="absolute left-4 top-1/2 text-xs text-zinc-600">DEVELOPMENT</div>
                  <div className="absolute left-4 top-3/4 text-xs text-zinc-600">TESTING</div>
                  
                  {/* Progress line */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-0.5 bg-zinc-800 relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
                      />
                      {/* Step markers */}
                      {WORKFLOW_STEPS.slice(0, -1).map((step, i) => (
                        <div
                          key={step.id}
                          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all ${
                            i < currentStepIndex ? 'bg-green-500 border-green-400' :
                            i === currentStepIndex ? 'bg-indigo-500 border-indigo-400 animate-pulse' :
                            'bg-zinc-900 border-zinc-700'
                          }`}
                          style={{ left: `${(i / (WORKFLOW_STEPS.length - 2)) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pixel Agents */}
                <div className="absolute inset-0">
                  {agents.map(agent => (
                    <PixelAgent key={agent.id} agent={agent} />
                  ))}
                </div>

                {/* Current step indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-zinc-300">
                    {WORKFLOW_STEPS[currentStepIndex]?.description}
                  </p>
                </div>
              </div>
            )}

            {activeView === 'sprints' && <SprintBoard />}
            {activeView === 'chat' && <AgentChat />}
          </div>
        </div>

        {/* Right panel - Current task details */}
        <div className="w-80 border-l border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Active Tasks</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {agents.filter(a => a.status === 'working' || a.status === 'talking').map(agent => (
              <div key={agent.id} className="mb-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{agent.emoji}</span>
                  <span className="text-sm font-medium">{agent.name}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{agent.currentTask}</p>
                <div className="mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
              </div>
            ))}
            
            {agents.filter(a => a.status === 'idle').length > 0 && (
              <>
                <h3 className="text-xs text-zinc-500 mt-4 mb-2">Idle Agents</h3>
                {agents.filter(a => a.status === 'idle').map(agent => (
                  <div key={agent.id} className="mb-2 p-2 bg-zinc-900/30 rounded border border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span>{agent.emoji}</span>
                      <span className="text-xs text-zinc-500">{agent.name}</span>
                      <span className="ml-auto text-xs text-zinc-600">💤</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
