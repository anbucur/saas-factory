import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer, WebSocket } from 'ws'
import { initializeDatabase } from './db/index.js'
import { AgentEngine } from './agents/engine.js'
import { createProjectRoutes } from './routes/projects.js'
import { AGENT_ROLES } from './agents/roles.js'
import { isCodingAgentAvailable } from './agents/coding-agent.js'

// Initialize database
initializeDatabase()

const app = new Hono()

// Enable CORS for frontend
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Track connected WebSocket clients
const clients = new Set<WebSocket>()

function broadcast(event: object) {
  const message = JSON.stringify(event)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Create engine with real broadcast
const engine = new AgentEngine(broadcast)

// Health check
app.get('/api/health', (c) => {
  const codingAgent = isCodingAgentAvailable()
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    codingAgent,
  })
})

// Agent roles metadata
app.get('/api/agents/roles', (c) => {
  return c.json(AGENT_ROLES)
})

// Coding agent status
app.get('/api/coding-agent/status', (c) => {
  return c.json(isCodingAgentAvailable())
})

// Mount project routes
app.route('/api/projects', createProjectRoutes(engine))

// Start HTTP server
const port = 3010
console.log(`SaaS Factory API running on http://localhost:${port}`)

const codingAgent = isCodingAgentAvailable()
if (codingAgent.available) {
  console.log(`Coding Agent: ${codingAgent.name} (available)`)
} else {
  console.log('Coding Agent: not available (using fallback mode)')
}

const server = serve({
  fetch: app.fetch,
  port,
})

// WebSocket server
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`)
  if (url.pathname !== '/ws') {
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    clients.add(ws)
    console.log(`[WS] Client connected. Total: ${clients.size}`)

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[WS] Client disconnected. Total: ${clients.size}`)
    })

    ws.on('error', (err) => {
      console.error('[WS] Error:', err)
      clients.delete(ws)
    })

    ws.send(JSON.stringify({ type: 'connected', payload: { timestamp: new Date().toISOString() } }))
  })
})

export { app, engine }
