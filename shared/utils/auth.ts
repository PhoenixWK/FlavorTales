/**
 * Lightweight client-side session helpers.
 *
 * The actual authentication token lives in an HTTP-only cookie set by the
 * backend and is invisible to JavaScript. We store only *display* information
 * (userId, username, email, role) in localStorage so the UI can greet the
 * user and make role-based decisions without needing an extra /me endpoint.
 *
 * IMPORTANT: this data is for UI purposes only. Every protected API call is
 * authenticated by the cookie — never trust localStorage for security decisions.
 *
 * Vendor and admin use separate localStorage keys so they can coexist in the
 * same browser without overwriting each other's session metadata.
 */

const SESSION_KEY = "ft_vendor_session";
const ADMIN_SESSION_KEY = "ft_admin_session";

export interface VendorSession {
  userId: number;
  username: string;
  email: string;
  role: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function readSession(key: string): VendorSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as VendorSession) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, session: VendorSession): void {
  try {
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Private browsing or storage quota exceeded – silently ignore
  }
}

function deleteSession(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ── Vendor session ────────────────────────────────────────────────────────────

export function saveSession(session: VendorSession): void {
  writeSession(SESSION_KEY, session);
}

export function getSession(): VendorSession | null {
  return readSession(SESSION_KEY);
}

export function clearSession(): void {
  deleteSession(SESSION_KEY);
}

// ── Admin session ─────────────────────────────────────────────────────────────

export function saveAdminSession(session: VendorSession): void {
  writeSession(ADMIN_SESSION_KEY, session);
}

export function getAdminSession(): VendorSession | null {
  return readSession(ADMIN_SESSION_KEY);
}

export function clearAdminSession(): void {
  deleteSession(ADMIN_SESSION_KEY);
}
