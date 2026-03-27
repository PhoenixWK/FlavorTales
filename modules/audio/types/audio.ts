export type AudioLanguage = "vi" | "en" | "zh" | "ko" | "ru" | "ja";
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
  ko: AudioResponse | null;
  ru: AudioResponse | null;
  ja: AudioResponse | null;
}

/** Chuyển array sang map theo languageCode để dễ tra cứu trong UI. */
export function toAudioByLanguage(list: AudioResponse[]): AudioByLanguage {
  const find = (lang: AudioLanguage) => list.find((a) => a.languageCode === lang) ?? null;
  return { vi: find("vi"), en: find("en"), zh: find("zh"), ko: find("ko"), ru: find("ru"), ja: find("ja") };
}
