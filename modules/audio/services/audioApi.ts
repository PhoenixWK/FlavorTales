import type { AudioResponse } from "@/modules/audio/types/audio";

export type SupportedLanguage = "vi" | "en" | "zh" | "ko" | "ru" | "ja";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Kết quả trả về sau khi TTS/upload thành công và đã lưu vào audio table. */
export interface AudioUploadResult {
  audioId: number | null;
  language: string;
  fileId: number;
  fileUrl: string;
  durationSeconds: number | null;
}

const AUDIO_PROXY_BASE = "/api/audio";

/**
 * Tạo TTS cho shop và lưu vào bảng audio.
 * Gọi sau khi shop/POI đã được tạo (shopId có sẵn).
 */
export async function generateTtsForShop(
  shopId: number,
  text: string,
  language: SupportedLanguage
): Promise<ApiResponse<AudioUploadResult>> {
  const res = await fetch(`${AUDIO_PROXY_BASE}/shop/${shopId}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
    throw new Error("Session expired");
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `TTS failed (HTTP ${res.status})`);
  return json;
}

/**
 * Upload file audio cho shop và lưu vào bảng audio.
 * Gọi sau khi shop/POI đã được tạo.
 */
export async function uploadAudioForShop(
  shopId: number,
  blob: Blob,
  language: SupportedLanguage
): Promise<ApiResponse<AudioUploadResult>> {
  const formData = new FormData();
  const filename =
    blob instanceof File && blob.name
      ? blob.name
      : `shop_${language}_${Date.now()}.mp3`;
  formData.append("file", blob, filename);
  formData.append("language", language);

  const res = await fetch(`${AUDIO_PROXY_BASE}/shop/${shopId}/upload`, {
    method: "POST",
    body: formData,
  });

  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
    throw new Error("Session expired");
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `Upload failed (HTTP ${res.status})`);
  return json;
}

/** Lấy danh sách audio của shop (qua cache). */
export async function getAudioByShop(shopId: number): Promise<AudioResponse[]> {
  const res = await fetch(`${AUDIO_PROXY_BASE}/shop/${shopId}`);
  if (!res.ok) throw new Error(`Failed to fetch audio for shop ${shopId}`);
  const json: ApiResponse<AudioResponse[]> = await res.json();
  return json.data ?? [];
}

/** Lấy danh sách audio của POI (qua cache). */
export async function getAudioByPoi(poiId: number): Promise<AudioResponse[]> {
  const res = await fetch(`${AUDIO_PROXY_BASE}/poi/${poiId}`);
  if (!res.ok) throw new Error(`Failed to fetch audio for poi ${poiId}`);
  const json: ApiResponse<AudioResponse[]> = await res.json();
  return json.data ?? [];
}

/**
 * Upload nhiều audio blobs song song cho cùng một shopId.
 * Lỗi từng ngôn ngữ không chặn các ngôn ngữ còn lại.
 */
export async function uploadAudiosForShop(
  shopId: number,
  audioBlobs: Partial<Record<SupportedLanguage, Blob>>,
  onError?: (lang: SupportedLanguage, message: string) => void
): Promise<void> {
  const all: SupportedLanguage[] = ["vi", "en", "zh", "ko", "ru", "ja"];
  const langs = all.filter((l) => audioBlobs[l]) as SupportedLanguage[];

  const results = await Promise.allSettled(
    langs.map((lang) => uploadAudioForShop(shopId, audioBlobs[lang]!, lang))
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const msg = String(result.reason) || `Tải audio ${langs[i]} thất bại.`;
      onError?.(langs[i], msg);
    }
  });
}
