/**
 * Broadcast module for real-time WebSocket events
 * Worker connects to API server's WebSocket to push events
 */

let broadcastFn: (event: unknown) => void = () => {}

export function setBroadcast(fn: (event: unknown) => void): void {
  broadcastFn = fn
}

export function broadcast(event: unknown): void {
  broadcastFn(event)
}
