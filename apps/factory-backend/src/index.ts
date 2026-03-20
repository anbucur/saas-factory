import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer, WebSocket } from 'ws'

const app = new Hono()

// Enable CORS for frontend
app.use('*', cors())

// Track connected WebSocket clients
const clients = new Set<WebSocket>()

// Broadcast to all connected clients
function broadcast(event: object) {
  const message = JSON.stringify(event)
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', temporal: 'connected' }))

// Start a new build
app.post('/api/builds', async (c) => {
  const body = await c.req.json<{ name: string; description: string }>()
  const buildId = crypto.randomUUID()

  // In production, this would start a Temporal workflow
  // For now, simulate the process
  console.log(`Starting build ${buildId}: ${body.name}`)

  // Broadcast build started
  broadcast({
    type: 'build:started',
    payload: { buildId, name: body.name, description: body.description },
  })

  return c.json({ buildId, status: 'started' })
})

// Get build status
app.get('/api/builds/:id', (c) => {
  const id = c.req.param('id')
  // In production, query Temporal for status
  return c.json({ buildId: id, status: 'running', progress: 45 })
})

// Event ingestion endpoint — accepts events from the Temporal worker and
// broadcasts them to all connected WebSocket clients
app.post('/api/events', async (c) => {
  const event = await c.req.json<{
    type: string
    payload: Record<string, unknown>
    timestamp?: number
  }>()

  // Broadcast to all WebSocket clients
  broadcast({
    type: event.type,
    payload: event.payload,
    timestamp: event.timestamp ?? Date.now(),
  })

  return c.json({ ok: true })
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', async (c) => {
    return c.text('Production mode - serve from build')
  })
}

const port = 3001
console.log(`🚀 Factory Backend running on http://localhost:${port}`)

// Start HTTP server and attach WebSocket handler
const server = serve({
  fetch: app.fetch,
  port,
})

// WebSocket server on /ws path using the raw HTTP server's upgrade event
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`)
  if (url.pathname !== '/ws') {
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    clients.add(ws)
    console.log('Client connected. Total:', clients.size)

    ws.on('close', () => {
      clients.delete(ws)
      console.log('Client disconnected. Total:', clients.size)
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err)
      clients.delete(ws)
    })

    // Send initial connected event
    ws.send(JSON.stringify({ type: 'connected', payload: { timestamp: Date.now() } }))
  })
})
