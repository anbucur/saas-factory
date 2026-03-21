import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/store';
import type { WSEvent } from '../types';

const WS_URL = 'ws://localhost:3010/ws';
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounting = useRef(false);
  const handleWSEvent = useAppStore((s) => s.handleWSEvent);
  const setWsConnected = useAppStore((s) => s.setWsConnected);

  useEffect(() => {
    isUnmounting.current = false;

    function connect() {
      if (isUnmounting.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempt.current = 0;
          setWsConnected(true);
          console.log('[WS] Connected');
        };

        ws.onmessage = (ev) => {
          try {
            const event = JSON.parse(ev.data) as WSEvent;
            handleWSEvent(event);
          } catch (err) {
            console.error('[WS] Failed to parse message:', err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          wsRef.current = null;

          if (!isUnmounting.current) {
            // Exponential backoff with jitter: 1s, 2s, 4s, 8s... up to 30s max
            const backoff = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempt.current), MAX_DELAY);
            const jitter = Math.random() * 500; // 0-500ms random jitter
            const delay = Math.round(backoff + jitter);
            reconnectAttempt.current++;

            console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current})`);
            reconnectTimeout.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = (err) => {
          console.error('[WS] Error:', err);
        };
      } catch (err) {
        console.error('[WS] Failed to create WebSocket:', err);
        // Retry after base delay on creation error
        reconnectTimeout.current = setTimeout(connect, BASE_DELAY);
      }
    }

    connect();

    return () => {
      isUnmounting.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleWSEvent, setWsConnected]);
}
