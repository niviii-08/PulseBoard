import { useEffect, useRef } from "react";
import { USE_MOCK_DATA } from "@/lib/api/client";
import { useWebSocketStore } from "@/store/websocketStore";
import type { RealtimeEvent } from "@/types/domain";
import { mockEmergingTrends } from "@/lib/api/mockData";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/api/v1/ws/status";
const RECONNECT_DELAY_MS = 3000;

/**
 * Manages the app's single WebSocket connection to WS /api/v1/ws/status
 * and mirrors its state into useWebSocketStore. Call this once, near the
 * app root (see src/App.tsx) -- every component that cares about
 * connection status or live events reads from the store, not from this
 * hook directly, so there is exactly one socket for the whole app
 * regardless of how many components display a "live" indicator.
 *
 * In mock mode (USE_MOCK_DATA, see src/lib/api/client.ts), no real
 * socket is opened. Instead, a small interval simulates a "connected"
 * feed by emitting a harmless EMERGING_TREND_DETECTED event drawn from
 * the same mock trend data every other part of the app uses, so every
 * connection-status- and live-event-driven UI surface is fully
 * exercised during frontend development without a running backend.
 * Flipping USE_MOCK_DATA to false switches to the real
 * `new WebSocket(WS_URL)` branch below with no other code changes.
 */
export function useWebSocket() {
  const setStatus = useWebSocketStore((s) => s.setStatus);
  const pushEvent = useWebSocketStore((s) => s.pushEvent);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setStatus("connecting");
      const connectTimer = setTimeout(() => setStatus("connected"), 600);

      const emitMockEvent = () => {
        const trend = mockEmergingTrends[Math.floor(Math.random() * mockEmergingTrends.length)];
        const event: RealtimeEvent = {
          event_type: "EMERGING_TREND_DETECTED",
          timestamp: new Date().toISOString(),
          data: { topic_id: trend.id, topic_name: trend.name, trend_score: trend.trend_score },
        };
        pushEvent(event);
      };

      const interval = setInterval(emitMockEvent, 15_000);

      return () => {
        clearTimeout(connectTimer);
        clearInterval(interval);
        setStatus("disconnected");
      };
    }

    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(WS_URL);

      socket.onopen = () => setStatus("connected");

      socket.onmessage = (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data) as RealtimeEvent;
          pushEvent(parsed);
        } catch {
          // Malformed payload -- ignore rather than crash the whole
          // connection over one bad message.
        }
      };

      socket.onerror = () => setStatus("error");

      socket.onclose = () => {
        setStatus("disconnected");
        if (!cancelled) {
          reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      socket?.close();
    };
  }, [setStatus, pushEvent]);
}
