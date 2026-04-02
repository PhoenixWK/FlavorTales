"use client";

import { useStompSubscription } from "@/shared/hooks/useStompSubscription";

const WS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/ws`;
const TOURIST_PING_TOPIC = "/topic/tourist-ping";

/**
 * Signals tourist presence to the backend by subscribing to the tourist-ping topic.
 *
 * The server tracks this STOMP subscription to count live visitors. When the
 * WebSocket disconnects (tab close, browser close, network loss), the server
 * detects SessionDisconnectEvent within milliseconds and decrements the count —
 * no client-side cleanup code required.
 */
export function useTouristPresence(): void {
  useStompSubscription<never>({
    url: WS_URL,
    topic: TOURIST_PING_TOPIC,
    onMessage: () => {},
  });
}
