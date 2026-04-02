"use client";

import { useState, useCallback } from "react";
import { useStompSubscription } from "@/shared/hooks/useStompSubscription";
import { fetchActiveVisitorCount } from "../services/analyticsApi";
import { useEffect } from "react";

const WS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/ws`;
const TOPIC = "/topic/active-visitors";

/**
 * Subscribes to real-time active-visitor broadcasts via STOMP/WebSocket.
 * Fetches the initial count over REST so the UI is populated before the
 * first broadcast arrives.
 */
export function useActiveVisitors(): number | null {
  const [count, setCount] = useState<number | null>(null);

  // Initial REST fetch so the value is shown immediately on mount.
  useEffect(() => {
    fetchActiveVisitorCount()
      .then(setCount)
      .catch(() => {/* will be updated by WebSocket broadcast */});
  }, []);

  const handleMessage = useCallback((data: number) => {
    setCount(data);
  }, []);

  useStompSubscription<number>({ url: WS_URL, topic: TOPIC, onMessage: handleMessage });

  return count;
}
