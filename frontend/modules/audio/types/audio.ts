export type AudioLanguage = "vi" | "en" | "zh";
export type AudioProcessingStatus = "processing" | "completed" | "failed";
export type AudioStatus = "pending" | "active" | "rejected" | "disabled";

export interface AudioResponse {
  audioId: number;
  shopId: number;
  poiId: number | null;
  languageCode: AudioLanguage;
  fileUrl: string;
  durationSeconds: number | null;
  ttsProvider: string | null;
  processingStatus: AudioProcessingStatus;
  status: AudioStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AudioByLanguage {
  vi: AudioResponse | null;
  en: AudioResponse | null;
  zh: AudioResponse | null;
}

/** Chuyển array sang map theo languageCode để dễ tra cứu trong UI. */
export function toAudioByLanguage(list: AudioResponse[]): AudioByLanguage {
  return {
    vi: list.find((a) => a.languageCode === "vi") ?? null,
    en: list.find((a) => a.languageCode === "en") ?? null,
    zh: list.find((a) => a.languageCode === "zh") ?? null,
  };
}
