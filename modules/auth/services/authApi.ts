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
