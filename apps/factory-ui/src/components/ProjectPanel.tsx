import { useState } from 'react'
import { useFactoryStore } from '../store/factoryStore'

export function ProjectPanel() {
  const { project, isRunning, startProject, resetProject } = useFactoryStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleStart = () => {
    if (!name.trim()) return
    startProject(name.trim(), description.trim())
  }

  // Demo mode - simulate a running project
  const handleDemo = () => {
    startProject('Demo SaaS', 'A sample project to showcase the factory')

    // Simulate some agents
    const { spawnAgent, updateAgentProgress, completeAgent } = useFactoryStore.getState()

    // Spawn Coder
    setTimeout(() => spawnAgent('coder', 'Setting up project structure...'), 500)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents[0].id, 30, 'Writing core modules...'), 2000)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents[0].id, 70, 'Adding API routes...'), 4000)
    setTimeout(() => completeAgent(useFactoryStore.getState().project!.agents[0].id), 5500)

    // Spawn UI Agent (parallel)
    setTimeout(() => spawnAgent('ui', 'Building component library...'), 800)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents.find(a => a.type === 'ui')?.id || '', 40, 'Styling components...'), 2500)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents.find(a => a.type === 'ui')?.id || '', 80, 'Adding animations...'), 4000)
    setTimeout(() => completeAgent(useFactoryStore.getState().project!.agents.find(a => a.type === 'ui')?.id || ''), 6000)

    // Spawn Security Agent (next phase)
    setTimeout(() => spawnAgent('security', 'Running security audit...'), 7000)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents.find(a => a.type === 'security')?.id || '', 50, 'Checking dependencies...'), 9000)
    setTimeout(() => completeAgent(useFactoryStore.getState().project!.agents.find(a => a.type === 'security')?.id || ''), 10500)

    // Spawn Billing Agent
    setTimeout(() => spawnAgent('billing', 'Integrating Stripe...'), 11000)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents.find(a => a.type === 'billing')?.id || '', 60, 'Setting up subscriptions...'), 13000)
    setTimeout(() => completeAgent(useFactoryStore.getState().project!.agents.find(a => a.type === 'billing')?.id || ''), 14500)

    // Deploy
    setTimeout(() => spawnAgent('deploy', 'Deploying to production...'), 15000)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents.find(a => a.type === 'deploy')?.id || '', 50, 'Building Docker image...'), 16500)
    setTimeout(() => updateAgentProgress(useFactoryStore.getState().project!.agents.find(a => a.type === 'deploy')?.id || '', 80, 'Pushing to registry...'), 18000)
    setTimeout(() => completeAgent(useFactoryStore.getState().project!.agents.find(a => a.type === 'deploy')?.id || ''), 19500)
    setTimeout(() => useFactoryStore.getState().completeProject('https://demo-saas.fly.dev'), 20000)
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          🏭 SaaS Factory
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!project ? (
          <>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-zinc-400 mb-1 block">Project Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome SaaS"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block">
                <span className="text-sm text-zinc-400 mb-1 block">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should this SaaS do?"
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </label>

              <button
                onClick={handleStart}
                disabled={!name.trim()}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Start Project
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-zinc-900 text-xs text-zinc-500">or</span>
              </div>
            </div>

            <button
              onClick={handleDemo}
              className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-medium rounded-lg text-sm transition-colors"
            >
              ▶️ Run Demo
            </button>
          </>
        ) : (
          <>
            {/* Project info */}
            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <h3 className="font-semibold text-zinc-100">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-zinc-400 mt-1">{project.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    project.completedAt
                      ? 'bg-green-400'
                      : isRunning
                      ? 'bg-indigo-400 animate-pulse'
                      : 'bg-zinc-500'
                  }`}
                />
                <span className="text-xs text-zinc-400">
                  {project.completedAt
                    ? 'Complete'
                    : isRunning
                    ? 'Running...'
                    : 'Idle'}
                </span>
              </div>
            </div>

            {/* Agent status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-300">Agents</h4>
              {project.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700/50"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: `rgba(99, 102, 241, 0.2)`,
                    }}
                  >
                    {agent.type === 'coder' && '🧑‍💻'}
                    {agent.type === 'ui' && '🎨'}
                    {agent.type === 'security' && '🛡️'}
                    {agent.type === 'billing' && '💰'}
                    {agent.type === 'deploy' && '🚀'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 capitalize">{agent.type}</div>
                    {agent.currentTask && (
                      <div className="text-xs text-zinc-500 truncate">{agent.currentTask}</div>
                    )}
                  </div>
                  <div className="text-xs">
                    {agent.status === 'done' && (
                      <span className="text-green-400">✓</span>
                    )}
                    {agent.status === 'working' && (
                      <span className="text-indigo-400">{agent.progress}%</span>
                    )}
                    {agent.status === 'error' && (
                      <span className="text-red-400">!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Phase status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-300">Phases</h4>
              <div className="flex gap-1">
                {project.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${
                      phase.status === 'complete'
                        ? 'bg-green-500/20 text-green-400'
                        : phase.status === 'active'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {phase.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={resetProject}
              className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-lg transition-colors"
            >
              New Project
            </button>
          </>
        )}
      </div>
    </div>
  )
}
