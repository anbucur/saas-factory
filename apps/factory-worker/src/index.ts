/**
 * Factory Worker - Standalone Temporal Worker Process
 * 
 * This is the main entry point for the standalone worker process.
 */

import { createRequire } from 'module'
import { Worker } from '@temporalio/worker'
import { Connection } from '@temporalio/client'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger'
import WebSocket from 'ws'
import * as activities from './activities/index.js'

const require = createRequire(import.meta.url)

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233'
const API_WS_URL = process.env.API_WS_URL || 'ws://localhost:3010/ws'
const TASK_QUEUE = process.env.TASK_QUEUE || 'factory-builds'
const OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'

let broadcast: (event: unknown) => void = () => {}

function connectToAPI() {
  console.log(`[Worker] Connecting to API WebSocket at ${API_WS_URL}...`)
  
  const ws = new WebSocket(API_WS_URL)
  
  ws.on('open', () => {
    console.log('[Worker] Connected to API WebSocket')
  })
  
  ws.on('error', (err) => {
    console.error('[Worker] WebSocket error:', err.message)
  })
  
  ws.on('close', () => {
    console.log('[Worker] WebSocket disconnected, reconnecting in 5s...')
    setTimeout(connectToAPI, 5000)
  })
  
  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString())
      if (event.type === 'connected') {
        console.log('[Worker] API connection confirmed')
      }
    } catch {
      // ignore parse errors
    }
  })
  
  broadcast = (event: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event))
    }
  }
}

function initTracing() {
  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  })

  const sdk = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    textMapPropagator: new JaegerPropagator(),
  })

  sdk.start()
  console.log('[Worker] OpenTelemetry tracing initialized')
  
  process.on('SIGTERM', () => sdk.shutdown())
  process.on('SIGINT', () => sdk.shutdown())
}

async function main() {
  console.log('[Worker] Starting standalone Temporal worker...')
  console.log(`[Worker] Temporal address: ${TEMPORAL_ADDRESS}`)
  console.log(`[Worker] Task queue: ${TASK_QUEUE}`)
  
  initTracing()
  connectToAPI()
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await Connection.connect({ address: TEMPORAL_ADDRESS })
  
  const worker = await Worker.create({
    workflowsPath: require.resolve('@saas-factory/temporal-workflows'),
    activities,
    namespace: 'default',
    taskQueue: TASK_QUEUE,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 5,
  })

  console.log('[Worker] Temporal worker started')
  console.log('[Worker] Graceful shutdown timeout: 30s')
  
  let isShuttingDown = false
  
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('[Worker] Shutdown already in progress...')
      return
    }
    isShuttingDown = true
    console.log(`[Worker] Received ${signal}, initiating graceful shutdown...`)
    
    try {
      await worker.shutdown()
      console.log('[Worker] Graceful shutdown completed')
      process.exit(0)
    } catch (err) {
      console.error('[Worker] Error during shutdown:', err)
      process.exit(1)
    }
  }
  
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  
  worker.run().catch(err => {
    if (!isShuttingDown) {
      console.error('[Worker] Fatal worker error:', err)
      process.exit(1)
    }
  })
}

main().catch(err => {
  console.error('[Worker] Failed to start:', err)
  process.exit(1)
})
