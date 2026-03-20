import { useEffect, useRef } from 'react'
import { useFactoryStore } from '../store/factoryStore'
import type { AgentType, LogEntry, PhaseId } from '../types'

const WS_URL = 'ws://localhost:3010/ws'
const MAX_RECONNECT_DELAY = 30000
const MAX_RECONNECT_ATTEMPTS = 10

// Extended event types to cover backend events not in the client types
type BackendEvent =
  | { type: 'connected'; payload: Record<string, never> }
  | { type: 'build:started'; payload: { name: string; description: string } }
  | { type: 'agent:spawn'; payload: { agentId: string; agent: string; task?: string } }
  | { type: 'agent:progress'; payload: { agentId: string; progress: number; message: string } }
  | { type: 'agent:complete'; payload: { agentId: string } }
  | { type: 'phase:start'; payload: { phaseId: string } }
  | { type: 'phase:complete'; payload: { phaseId: string } }
  | { type: 'agent:error'; payload: { agentId: string; error: string } }
  | { type: 'phase:complete'; payload: { phaseId: PhaseId } }
  | { type: 'log'; payload: Omit<LogEntry, 'id' | 'timestamp'> }
  | { type: 'project:complete'; payload: { url: string } }

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let destroyed = false

    function connect() {
      if (destroyed) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (destroyed) return
        console.log('[WS] Connected to factory backend')
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        if (destroyed) return
        try {
          const msg: BackendEvent = JSON.parse(event.data)
          console.log('[WS] Received:', msg.type, msg)
          handleEvent(msg)
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      }

      ws.onerror = (err) => {
        if (destroyed) return
        console.error('[WS] Error:', err)
      }

      ws.onclose = () => {
        if (destroyed) return
        wsRef.current = null
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (destroyed) return
      const attempts = reconnectAttemptsRef.current
      if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('[WS] Max reconnect attempts reached. Giving up.')
        return
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, ... up to MAX_RECONNECT_DELAY
      const delay = Math.min(1000 * 2 ** attempts, MAX_RECONNECT_DELAY)
      reconnectAttemptsRef.current += 1
      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)

      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    function handleEvent(msg: BackendEvent) {
      const store = useFactoryStore.getState()

      switch (msg.type) {
        case 'connected':
          console.log('[WS] Backend confirmed connected')
          break

        case 'build:started':
          // Guard against double-start: only start if no project exists yet
          if (!store.project) {
            store.startProject(msg.payload.name, msg.payload.description)
          } else {
            console.log('[WS] build:started received but project already exists — skipping')
          }
          break

        case 'agent:spawn':
          store.spawnAgent(msg.payload.agent as AgentType, msg.payload.task || 'Working...')
          break

        case 'agent:progress':
          store.updateAgentProgress(msg.payload.agentId, msg.payload.progress, msg.payload.message)
          break

        case 'agent:complete':
          store.completeAgent(msg.payload.agentId)
          break

        case 'agent:error':
          store.errorAgent(msg.payload.agentId, msg.payload.error)
          break

        case 'phase:complete':
          store.completePhase(msg.payload.phaseId)
          break

        case 'log':
          store.addLog(msg.payload.agentId, msg.payload.agentType, msg.payload.message, msg.payload.type)
          break

        case 'project:complete':
          store.completeProject(msg.payload.url)
          break

        default:
          // TypeScript exhaustiveness check — runtime log for any unhandled event
          console.debug('[WS] Unhandled event type:', (msg as { type: string }).type, msg)
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])
}
