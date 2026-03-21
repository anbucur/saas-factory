import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/store';
import type { WSEvent } from '../types';

const WS_URL = 'ws://localhost:3010/ws';
const MAX_RECONNECT_ATTEMPTS = 15;
const BASE_DELAY = 1000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const handleWSEvent = useAppStore((s) => s.handleWSEvent);
  const setWsConnected = useAppStore((s) => s.setWsConnected);

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
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

        if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(BASE_DELAY * Math.pow(2, attemptsRef.current), 30000);
          attemptsRef.current++;
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${attemptsRef.current})`);
          setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleWSEvent, setWsConnected]);
}
