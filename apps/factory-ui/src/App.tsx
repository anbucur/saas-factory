/**
 * SaaS Factory - Main App
 * 
 * Uses the factoryStore which has proper WebSocket event handling
 */

import { useFactoryStore } from './store/factoryStore'
import { MissionControl } from './components/MissionControl'
import { ProjectSetup } from './components/ProjectSetup'

function App() {
  const { project } = useFactoryStore()

  if (!project) {
    return <ProjectSetup />
  }

  return <MissionControl />
}

export default App
