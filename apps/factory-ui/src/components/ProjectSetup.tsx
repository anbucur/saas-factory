/**
 * Project Setup - Initial form to configure the project
 */

import { useState } from 'react'
import { useFactoryStore } from '../store/factoryStore'

interface ProjectSetupProps {
  onComplete: () => void
}

const STACK_OPTIONS = [
  { id: 'react', label: 'React', icon: '⚛️' },
  { id: 'vue', label: 'Vue', icon: '💚' },
  { id: 'svelte', label: 'Svelte', icon: '🔥' },
  { id: 'nextjs', label: 'Next.js', icon: '▲' },
  { id: 'node', label: 'Node.js', icon: '🟢' },
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'go', label: 'Go', icon: '🐹' },
  { id: 'rust', label: 'Rust', icon: '🦀' },
  { id: 'postgres', label: 'PostgreSQL', icon: '🐘' },
  { id: 'mongodb', label: 'MongoDB', icon: '🍃' },
  { id: 'redis', label: 'Redis', icon: '🔴' },
  { id: 'docker', label: 'Docker', icon: '🐳' },
]

const FEATURE_SUGGESTIONS = [
  'User Authentication',
  'Blog Posts',
  'Comments & Replies',
  'AI Cover Image Generation',
  'File Upload',
  'Real-time Chat',
  'Payment Integration',
  'Email Notifications',
  'Search & Filter',
  'User Profiles',
  'Dashboard Analytics',
  'Social Sharing',
  'API REST/GraphQL',
  'WebSocket Updates',
]

export function ProjectSetup({ onComplete }: ProjectSetupProps) {
  const { startProject } = useFactoryStore()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedStack, setSelectedStack] = useState<string[]>(['react', 'node', 'postgres', 'docker'])
  const [customFeatures, setCustomFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')
  const [step, setFormStep] = useState(1)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleStack = (id: string) => {
    setSelectedStack(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const addFeature = () => {
    if (newFeature.trim() && !customFeatures.includes(newFeature.trim())) {
      setCustomFeatures([...customFeatures, newFeature.trim()])
      setNewFeature('')
    }
  }

  const removeFeature = (f: string) => {
    setCustomFeatures(customFeatures.filter(ff => ff !== f))
  }

  const handleStart = async () => {
    if (!name.trim()) {
      setError('Please enter a project name')
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      // Submit to backend to start the REAL workflow
      const response = await fetch('http://localhost:3010/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          features: customFeatures,
          stack: selectedStack,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('[ProjectSetup] Build started:', data)
      
      // Start the project in the store
      startProject(name.trim(), description.trim())
      
      // Start the workflow
      onComplete()
    } catch (err) {
      console.error('[ProjectSetup] Failed to start build:', err)
      setError(err instanceof Error ? err.message : 'Failed to start project')
      setIsStarting(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950">
      <div className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-800 bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
          <h1 className="text-2xl font-bold text-white">🚀 Create New Project</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure your SaaS application</p>
        </div>

        {/* Progress indicator */}
        <div className="px-8 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${step >= s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}
                `}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-0.5 ${step > s ? 'bg-indigo-600' : 'bg-zinc-800'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>Basics</span>
            <span>Stack</span>
            <span>Features</span>
          </div>
        </div>

        {/* Form content */}
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Awesome SaaS"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what your SaaS application does..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                onClick={() => name.trim() && setFormStep(2)}
                disabled={!name.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-medium transition-colors"
              >
                Next: Select Stack →
              </button>
            </div>
          )}

          {/* Step 2: Stack */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Tech Stack ({selectedStack.length} selected)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {STACK_OPTIONS.map(tech => (
                    <button
                      key={tech.id}
                      onClick={() => toggleStack(tech.id)}
                      className={`
                        p-3 rounded-lg border text-left transition-all
                        ${selectedStack.includes(tech.id)
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span>{tech.icon}</span>
                        <span className="text-sm font-medium">{tech.label}</span>
                        {selectedStack.includes(tech.id) && (
                          <span className="ml-auto text-indigo-400">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setFormStep(1)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setFormStep(3)}
                  disabled={selectedStack.length === 0}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-medium transition-colors"
                >
                  Next: Features →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Features */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Core Features ({customFeatures.length} selected)
                </label>
                
                {/* Quick select suggestions */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {FEATURE_SUGGESTIONS.filter(f => !customFeatures.includes(f)).map(feature => (
                    <button
                      key={feature}
                      onClick={() => setCustomFeatures([...customFeatures, feature])}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-full border border-zinc-700 hover:border-zinc-600 transition-colors"
                    >
                      + {feature}
                    </button>
                  ))}
                </div>

                {/* Custom feature input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={e => setNewFeature(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFeature()}
                    placeholder="Add custom feature..."
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addFeature}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Selected features */}
                {customFeatures.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm text-zinc-400">Selected Features:</label>
                    <div className="flex flex-wrap gap-2">
                      {customFeatures.map(f => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 text-sm rounded-lg border border-indigo-500/30"
                        >
                          {f}
                          <button
                            onClick={() => removeFeature(f)}
                            className="ml-1 text-indigo-400 hover:text-indigo-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setFormStep(2)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-600 disabled:to-zinc-600 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:shadow-none"
                >
                  {isStarting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Starting Build...
                    </span>
                  ) : (
                    '🚀 Start Building'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
