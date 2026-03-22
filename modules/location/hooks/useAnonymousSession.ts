"use client";

import { useCallback, useEffect, useState } from "react";
import * as locationApi from "../services/locationApi";
import type { TouristSessionData } from "../types/session";

// ── localStorage keys ─────────────────────────────────────────────────────────

const SESSION_ID_KEY = "ft_session_id";
const SESSION_EXPIRES_KEY = "ft_session_expires";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readStoredSession(): { id: string; expires: string } | null {
  try {
    const id = localStorage.getItem(SESSION_ID_KEY);
    const expires = localStorage.getItem(SESSION_EXPIRES_KEY);
    if (id && expires) return { id, expires };
  } catch {
    // localStorage unavailable (e.g. private browsing with blocked storage)
  }
  return null;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

function persistSession(id: string, expiresAt: string): void {
  try {
    localStorage.setItem(SESSION_ID_KEY, id);
    localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt);
  } catch {
    // Storage blocked — session lives in memory only for this tab
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
  } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseAnonymousSessionResult {
  /** Null until the session is initialised. */
  sessionId: string | null;
  /** Full session data once hydrated from the backend. */
  sessionData: TouristSessionData | null;
  /** True once the init flow has completed (success or fallback). */
  isReady: boolean;
  /** Persist a language preference change to the backend. */
  updateLanguage: (language: string) => Promise<void>;
}

/**
 * FR-UM-011: Manages the anonymous tourist session lifecycle.
 *
 * On mount the hook:
 *  1. Reads any existing sessionId from localStorage.
 *  2. Verifies it with the backend (handles TTL drift).
 *  3. Creates a new session when none is found or the stored one expired.
 *  4. Falls back gracefully when the network is unavailable — the app
 *     can still function using browser-detected language as default.
 */
export function useAnonymousSession(): UseAnonymousSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<TouristSessionData | null>(null);
  const [isReady, setIsReady] = useState(false);

  const bootstrap = useCallback(async () => {
    const stored = readStoredSession();

    // Try to reuse a non-expired stored session
    if (stored && !isExpired(stored.expires)) {
      try {
        const data = await locationApi.getTouristSession(stored.id);
        setSessionId(stored.id);
        setSessionData(data);
        setIsReady(true);
        return;
      } catch {
        // Session invalid on the server (deleted early); fall through to create
        clearStoredSession();
      }
    }

    // Create a fresh session
    try {
      const { sessionId: newId, expiresAt } = await locationApi.createTouristSession();
      persistSession(newId, expiresAt);
      setSessionId(newId);
      setIsReady(true);
    } catch {
      // Network unavailable – the app works in degraded / offline mode
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const updateLanguage = useCallback(
    async (language: string) => {
      if (!sessionId) return;
      try {
        const updated = await locationApi.updateTouristSession(sessionId, {
          languagePreference: language,
        });
        setSessionData(updated);
      } catch {
        // Silently ignore – preference will re-sync on next session init
      }
    },
    [sessionId]
  );

  return { sessionId, sessionData, isReady, updateLanguage };
}
