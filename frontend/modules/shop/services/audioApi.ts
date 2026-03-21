import type { TtsResult } from "@/modules/shop/types/shop";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Generates TTS audio for the given language and returns the raw bytes as a Blob.
 * Does NOT upload to R2 — call `uploadAudio` at form-submit time.
 *
 * Pass an AbortSignal to cancel the request (e.g. when the component unmounts).
 */
export async function previewAudio(
  text: string,
  language: "vi" | "en" | "zh",
  signal?: AbortSignal
): Promise<Blob> {
  const res = await fetch("/api/audio/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
    signal,
  });

  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let message = `Audio generation failed (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      // ignore JSON parse error — body may be binary or empty
    }
    throw new Error(message);
  }

  return res.blob();
}

/**
 * Uploads a pre-generated audio Blob to Cloudflare R2.
 * Returns the persistent file ID + URL. Called at form-submit time.
 */
export async function uploadAudio(
  blob: Blob,
  language: "vi" | "en" | "zh"
): Promise<ApiResponse<TtsResult>> {
  const formData = new FormData();
  const filename =
    blob instanceof File && blob.name
      ? blob.name
      : `shop_${language}_${Date.now()}.mp3`;
  formData.append("file", blob, filename);
  formData.append("language", language);

  const res = await fetch("/api/audio/upload", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
  }
  return json;
}

