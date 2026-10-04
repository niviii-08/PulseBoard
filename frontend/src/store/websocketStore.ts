import { create } from "zustand";
import type { RealtimeEvent } from "@/types/domain";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const MAX_EVENT_HISTORY = 50;

/**
 * Live WebSocket connection state, fed by src/hooks/useWebSocket.ts.
 * Separated from authStore because these two pieces of state genuinely
 * change independently and for different reasons (a WS reconnect has
 * nothing to do with whether the user is logged in) -- keeping them in
 * one store would mean every WS reconnect re-renders every component
 * subscribed to auth state, and vice versa.
 */
interface WebSocketState {
  status: ConnectionStatus;
  lastEvent: RealtimeEvent | null;
  eventHistory: RealtimeEvent[];
  setStatus: (status: ConnectionStatus) => void;
  pushEvent: (event: RealtimeEvent) => void;
  clearHistory: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  status: "disconnected",
  lastEvent: null,
  eventHistory: [],

  setStatus: (status) => set({ status }),

  pushEvent: (event) =>
    set((state) => ({
      lastEvent: event,
      // Bounded so a long-running session doesn't grow this array
      // forever -- only the most recent MAX_EVENT_HISTORY events are
      // kept, newest first, for UI surfaces like an activity feed.
      eventHistory: [event, ...state.eventHistory].slice(0, MAX_EVENT_HISTORY),
    })),

  clearHistory: () => set({ eventHistory: [] }),
}));
