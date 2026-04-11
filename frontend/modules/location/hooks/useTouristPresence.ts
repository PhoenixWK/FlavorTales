"use client";

import { useEffect } from "react";
import { useStompSubscription } from "@/shared/hooks/useStompSubscription";

const WS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/ws`;
const TOURIST_PING_TOPIC = "/topic/tourist-ping";
const HEARTBEAT_DESTINATION = "/app/tourist-heartbeat";
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Signals tourist presence to the backend.
 *
 * - Subscribes to `/topic/tourist-ping` so the server registers this STOMP session.
 * - Sends a heartbeat to `/app/tourist-heartbeat` every 30 s so the server can
 *   distinguish active tabs from fully closed ones. The server keeps each tab
 *   "online" as long as heartbeats arrive; it removes the entry after a 90 s
 *   grace period of silence (≈ 3 missed beats).
 */
export function useTouristPresence(): void {
  const { clientRef } = useStompSubscription<never>({
    url: WS_URL,
    topic: TOURIST_PING_TOPIC,
    onMessage: () => {},
  });

  useEffect(() => {
    const id = setInterval(() => {
      const client = clientRef.current;
      if (client?.connected) {
        client.publish({ destination: HEARTBEAT_DESTINATION, body: "" });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(id);
  }, [clientRef]);
}
