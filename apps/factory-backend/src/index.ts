import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer, WebSocket } from 'ws'
import { Client, Connection } from '@temporalio/client'

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

// Temporal client — created lazily so the backend still starts if Temporal is down
let temporalClient: Client | null = null

async function getTemporalClient(): Promise<Client | null> {
  if (temporalClient) return temporalClient
  try {
    const connection = await Connection.connect({ address: 'localhost:7233' })
    temporalClient = new Client({ connection })
    console.log('✅ Temporal client connected')
    return temporalClient
  } catch (err) {
    console.warn('⚠️  Temporal unavailable — builds will broadcast start event only:', err)
    return null
  }
}

// Health check — reflects live Temporal connectivity
app.get('/api/health', async (c) => {
  const client = await getTemporalClient()
  return c.json({ status: 'ok', temporal: client ? 'connected' : 'unavailable' })
})

// Start a new build — launches a Temporal workflow when available
app.post('/api/builds', async (c) => {
  const body = await c.req.json<{ 
    name?: string; 
    description?: string; 
    features?: string[];
    stack?: string[];
  }>()

  // Input validation
  if (!body.name?.trim()) {
    return c.json({ error: 'Project name is required' }, 400)
  }
  if (body.name.length > 100) {
    return c.json({ error: 'Project name must be 100 characters or less' }, 400)
  }
  if (body.description && body.description.length > 2000) {
    return c.json({ error: 'Description must be 2000 characters or less' }, 400)
  }

  const buildId = crypto.randomUUID()
  const name = body.name.trim()

  console.log(`[API] POST /api/builds - ${name} (${buildId})`)
  console.log(`[API] Features: ${body.features?.join(', ') || 'none'}`)
  console.log(`[API] Stack: ${body.stack?.join(', ') || 'default'}`)

  // Broadcast immediately so the UI shows the build as started
  broadcast({
    type: 'build:started',
    payload: { buildId, name, description: body.description || '', features: body.features || [], stack: body.stack || [] },
  })
  console.log(`[API] Broadcasted build:started to ${clients.size} clients`)

  const client = await getTemporalClient()
  if (client) {
    await client.workflow.start('buildSaaS', {
      taskQueue: 'factory-builds',
      workflowId: buildId,
      args: [
        {
          name,
          description: body.description?.trim() || '',
          features: body.features ?? [],
          stack: body.stack ?? ['react', 'node', 'postgres'],
          billingMode: 'none',
        },
      ],
    })
    console.log(`▶  Temporal workflow started  ${buildId}: ${name}`)
  } else {
    console.log(`⚠️  Simulating build (Temporal unavailable)  ${buildId}: ${name}`)
  }

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

const port = 3010
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
