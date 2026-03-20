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

// WebSocket endpoint for real-time updates
app.use('/ws', async (c) => {
  // Upgrade to WebSocket
  const upgradeHeader = c.req.header('upgrade')
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426)
  }

  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws) => {
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

    // Send initial state
    ws.send(JSON.stringify({ type: 'connected', payload: { timestamp: Date.now() } }))
  })

  // Return a 401 if we can't upgrade (Hono doesn't handle this natively)
  return c.text('WebSocket upgrade failed', 401)
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', async (c) => {
    return c.text('Production mode - serve from build')
  })
}

const port = 3001
console.log(`🚀 Factory Backend running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
