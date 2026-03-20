import { useState } from 'react'
import { Board } from './components/Board'
import { BuildModal } from './components/BuildModal'
import { LogStream } from './components/LogStream'
import { ProjectPanel } from './components/ProjectPanel'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const [showBuildModal, setShowBuildModal] = useState(false)

  // Connect to factory backend WebSocket — handles lifecycle internally
  useWebSocket()

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <h1 className="text-lg font-semibold">SaaS Factory</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-full border border-zinc-700">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-zinc-400">Temporal Connected</span>
          </div>
          <button
            onClick={() => setShowBuildModal(true)}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
          >
            New Build
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Board area */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 min-h-0">
            <Board />
          </div>
          <div className="h-48 shrink-0 rounded-xl border border-zinc-800 overflow-hidden">
            <LogStream />
          </div>
        </div>

        {/* Side panel */}
        <div className="w-80 shrink-0">
          <ProjectPanel />
        </div>
      </div>

      {/* Build Modal */}
      <BuildModal isOpen={showBuildModal} onClose={() => setShowBuildModal(false)} />
    </div>
  )
}

export default App
