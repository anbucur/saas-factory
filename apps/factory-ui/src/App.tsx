/**
 * SaaS Factory - Main App
 * 
 * Shows ProjectSetup first, then MissionControl after project is configured
 */

import { useState } from 'react'
import { MissionControl } from './components/MissionControl'
import { ProjectSetup } from './components/ProjectSetup'

function App() {
  const [projectStarted, setProjectStarted] = useState(false)

  if (!projectStarted) {
    return <ProjectSetup onComplete={() => setProjectStarted(true)} />
  }

  return <MissionControl />
}

export default App
