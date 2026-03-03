const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// ---- Request / Response types -----------------------------------------------

export interface VendorRegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export interface RegisterResponse {
  userId: number;
  username: string;
  email: string;
  status: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---- Helpers ----------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const json = await res.json();
  if (!res.ok) {
    // Auto-logout: server invalidated the session (blacklisted or expired token)
    if (res.status === 401 && json?.message === "Session expired" && typeof window !== "undefined") {
      const from = encodeURIComponent(window.location.pathname);
      window.location.replace(`/auth/vendor/login?from=${from}&reason=session_expired`);
      return new Promise(() => {}); // never resolves – redirect is in progress
    }
    const message = json?.message ?? json?.error ?? "An unexpected error occurred.";
    // Carry HTTP status so callers can distinguish error types
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return json as ApiResponse<T>;
}

// ---- API calls ---------------------------------------------------------------

export async function vendorRegister(
  payload: VendorRegisterRequest
): Promise<ApiResponse<RegisterResponse>> {
  const res = await fetch(`${API_BASE}/api/auth/vendor/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<RegisterResponse>(res);
}

export async function verifyVendorEmail(
  email: string,
  code: string
): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/api/auth/vendor/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse<null>(res);
}

export async function resendVerificationCode(
  email: string
): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/api/auth/vendor/resend-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse<null>(res);
}

// ---- Login ------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  userId: number;
  email: string;
  username: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

/**
 * POST /api/auth/vendor/login
 *
 * Sends credentials and receives both JSON tokens and HTTP-only cookies.
 * `credentials: "include"` is required for the browser to store the cookies.
 *
 * HTTP error map (mirrors backend exceptions):
 *  - 400  Validation / bad request
 *  - 401  Invalid credentials  (InvalidCredentialsException)
 *  - 423  Account locked       (AccountLockedException)
 *  - 429  Rate-limited         (TooManyLoginAttemptsException)
 */
export async function vendorLogin(
  payload: LoginRequest
): Promise<ApiResponse<LoginResponse>> {
  const res = await fetch(`${API_BASE}/api/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",   // allow browser to store HTTP-only cookies
    body: JSON.stringify(payload),
  });
  return handleResponse<LoginResponse>(res);
}

// ---- Password Recovery -------------------------------------------------------

/**
 * POST /api/auth/vendor/forgot-password
 *
 * Always resolves (success: true) regardless of whether the email is
 * registered – the server never reveals email existence.
 *
 * HTTP error map:
 *  - 400  Validation error (blank / malformed email)
 *  - 429  IP rate limit exceeded (> 3 requests / hour)
 */
export async function forgotPassword(
  email: string
): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/api/auth/vendor/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse<null>(res);
}

/**
 * POST /api/auth/vendor/reset-password
 *
 * Validates the 6-digit one-time code and updates the password.
 *
 * HTTP error map:
 *  - 400  Invalid / expired / already-used token, or validation error
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/api/auth/vendor/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  });
  return handleResponse<null>(res);
}

// ---- Logout -----------------------------------------------------------------

/**
 * POST /api/auth/vendor/logout
 *
 * Asks the server to blacklist the current access token and clear the
 * HTTP-only cookies. The frontend clears its own localStorage session
 * regardless of the response outcome.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/vendor/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort – always clear client state even if the request fails
  }
}
