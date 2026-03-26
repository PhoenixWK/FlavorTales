import type { TtsResult } from "@/modules/shop/types/shop";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type SupportedLanguage = "vi" | "en" | "zh" | "ko" | "ru" | "ja";

export interface AllAudioPreviewResponse {
  /** language code → Base64-encoded MP3 bytes (only for succeeded languages) */
  audioBase64: Partial<Record<SupportedLanguage, string>>;
  /** Languages that failed synthesis */
  errors: Array<{ language: SupportedLanguage; message: string }>;
}

/**
 * Sends Vietnamese text to the backend, which auto-translates to all supported
 * languages and synthesises TTS in parallel. Returns base64-encoded MP3 per
 * language and a list of per-language errors for any that failed.
 */
export async function previewAllAudio(
  viText: string,
  signal?: AbortSignal
): Promise<AllAudioPreviewResponse> {
  const res = await fetch("/api/audio/tts/preview-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: viText }),
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
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  const json: ApiResponse<AllAudioPreviewResponse> = await res.json();
  return json.data;
}

/** Decodes a base64 string to an audio/mpeg Blob. */
export function base64ToAudioBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "audio/mpeg" });
}



/**
 * Uploads a pre-generated audio Blob to Cloudflare R2.
 * Returns the persistent file ID + URL. Called at form-submit time.
 */
export async function uploadAudio(
  blob: Blob,
  language: SupportedLanguage
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

