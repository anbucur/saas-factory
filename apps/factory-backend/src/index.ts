import { loadEnvFile } from 'node:process'
try { loadEnvFile() } catch { /* ignore if .env is missing */ }
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer, WebSocket } from 'ws'
import { Client, Connection } from '@temporalio/client'
import { initializeDatabase } from './db/index.js'
import { setBroadcast, startWorker } from './worker.js'
import { createProjectRoutes } from './routes/projects.js'
import { AGENT_ROLES } from './agents/roles.js'
import { isCodingAgentAvailable } from './agents/coding-agent.js'
import { callLLM } from './agents/llm.js'

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

function broadcast(event: unknown) {
  const message = JSON.stringify(event)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Wire broadcast into Temporal worker activities
setBroadcast(broadcast)

// Connect to Temporal server and start the in-process worker
let temporalClient: Client | undefined;
try {
  const connection = await Connection.connect({ address: 'localhost:7233' })
  temporalClient = new Client({ connection })
  await startWorker()
  console.log('Temporal: Connected and worker started')
} catch (error) {
  console.error('Temporal: Could not connect to Temporal server. Workflows will not be available.')
}

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
app.route('/api/projects', createProjectRoutes(broadcast, temporalClient))

// Start HTTP server
const port = 3010
console.log(`SaaS Factory API running on http://localhost:${port}`)
console.log('Temporal UI: http://localhost:8080')

const codingAgent = isCodingAgentAvailable()
if (codingAgent.available) {
  console.log(`Coding Agent: ${codingAgent.name} (available)`)
} else {
  console.log('Coding Agent: not available (using fallback mode)')
}

// LLM Health Check
console.log('Checking LLM API health...')
console.log('DEBUG API KEY IS:', process.env.MINIMAX_API_KEY ? 'Present (StartsWith: ' + process.env.MINIMAX_API_KEY.slice(0, 5) + ')' : 'UNDEFINED')
try {
  const llmStatus = await callLLM('You are a system health check. Just reply "OK".', [{role: 'user', content: 'Health Check'}], { maxTokens: 10 })
  if (llmStatus && llmStatus.content && !llmStatus.content.includes('## Project Plan') && !llmStatus.content.includes('I have analyzed')) {
    console.log('LLM API Health Check: OK ✅')
  } else {
    console.log('LLM API Health Check: USING FALLBACK MODE (Check your API key) ⚠️')
  }
} catch (error) {
  console.log('LLM API Health Check: FAILED ❌', error)
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

export { app }
