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

/**
 * Generic hook that opens a STOMP/SockJS connection, subscribes to a topic,
 * and tears everything down on unmount or when options change.
 *
 * Re-usable for any real-time feature that needs server-push updates.
 */
export function useStompSubscription<T>({
  url,
  topic,
  onMessage,
}: UseStompSubscriptionOptions<T>): void {
  // Keep a stable ref to the callback to avoid reconnecting on every render.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

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

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [url, topic]);
}
