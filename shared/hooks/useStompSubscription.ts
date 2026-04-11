"use client";

import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface UseStompSubscriptionOptions<T> {
  /** WebSocket endpoint URL (e.g. "/ws"). */
  url: string;
  /** STOMP topic to subscribe to (e.g. "/topic/active-visitors"). */
  topic: string;
  /** Called with the parsed message body each time a frame arrives. */
  onMessage: (data: T) => void;
}

export interface UseStompSubscriptionResult {
  /** Stable ref to the underlying STOMP client — safe to use in other effects. */
  clientRef: React.MutableRefObject<Client | null>;
}

/**
 * Generic hook that opens a STOMP/SockJS connection, subscribes to a topic,
 * and tears everything down on unmount or when options change.
 *
 * Reconnection behaviour:
 * - Auto-reconnects every 5 s on network loss (built-in `reconnectDelay`).
 * - Also reconnects immediately when the page becomes visible again after
 *   being hidden (tab switch, mobile app restore), so there is no multi-second
 *   delay before the connection is live again.
 *
 * Returns a stable `clientRef` so callers can publish messages (e.g. heartbeats).
 */
export function useStompSubscription<T>({
  url,
  topic,
  onMessage,
}: UseStompSubscriptionOptions<T>): UseStompSubscriptionResult {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 5_000,
      onConnect: () => {
        client.subscribe(topic, (frame) => {
          try {
            const data = JSON.parse(frame.body) as T;
            onMessageRef.current(data);
          } catch {
            // Ignore malformed frames
          }
        });
      },
    });

    clientRef.current = client;
    client.activate();

    // When the page becomes visible after being hidden, force an immediate
    // reconnect attempt if the client is not already connected.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !client.connected) {
        client.deactivate().then(() => client.activate());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      client.deactivate();
      clientRef.current = null;
    };
  }, [url, topic]);

  return { clientRef };
}
