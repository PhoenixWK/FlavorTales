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
 */

const SESSION_KEY = "ft_vendor_session";

export interface VendorSession {
  userId: number;
  username: string;
  email: string;
  role: string;
}

/** Persist session info to localStorage after a successful login. */
export function saveSession(session: VendorSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Private browsing or storage quota exceeded – silently ignore
  }
}

/** Read the current session. Returns null if not logged in or if SSR. */
export function getSession(): VendorSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as VendorSession) : null;
  } catch {
    return null;
  }
}

/** Remove session info (called on logout). */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
