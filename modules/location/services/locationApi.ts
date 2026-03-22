import type {
  CreateSessionResponse,
  TouristSessionData,
  UpdateSessionRequest,
} from "../types/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message ?? "Request failed");
  }
  return json.data as T;
}

/** POST /api/tourist/sessions — creates a new anonymous session */
export async function createTouristSession(): Promise<CreateSessionResponse> {
  const res = await fetch(`${API_BASE}/api/tourist/sessions`, { method: "POST" });
  return handleResponse<CreateSessionResponse>(res);
}

/** GET /api/tourist/sessions/{sessionId} — validates an existing session */
export async function getTouristSession(sessionId: string): Promise<TouristSessionData> {
  const res = await fetch(`${API_BASE}/api/tourist/sessions/${encodeURIComponent(sessionId)}`);
  return handleResponse<TouristSessionData>(res);
}

/** PATCH /api/tourist/sessions/{sessionId} — updates language / cache lists */
export async function updateTouristSession(
  sessionId: string,
  data: UpdateSessionRequest
): Promise<TouristSessionData> {
  const res = await fetch(
    `${API_BASE}/api/tourist/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<TouristSessionData>(res);
}
