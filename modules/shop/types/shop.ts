// ── Shop form types (FR-CM-001) ───────────────────────────────────────────

export interface OpeningHoursDto {
  day: number;      // 0 = Monday … 6 = Sunday
  open: string;     // "HH:mm"
  close: string;    // "HH:mm"
  closed: boolean;
}

export const DAY_LABELS = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
] as const;

export const AVAILABLE_TAGS = [
  "Bình dân",
  "Gia truyền",
  "Chay",
  "Hải sản",
  "Đặc sản vùng miền",
] as const;

export interface ShopCreatePayload {
  name: string;
  description: string;
  avatarFileId: number;
  additionalImageIds: number[];
  specialtyDescription: string;
  openingHours: OpeningHoursDto[];
  tags: string[];
  viAudioFileId: number | null;
  enAudioFileId: number | null;
}

export interface ShopCreateResponse {
  shopId: number;
  name: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface FileUploadResult {
  fileId: number;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface TtsResult {
  /** Language synthesized: "vi" or "en" */
  language: string;
  fileId: number;
  fileUrl: string;
}

// ── Draft auto-save ──────────────────────────────────────────────────────

export interface ShopDraftState {
  name: string;
  description: string;
  avatarFileId: number | null;
  avatarPreviewUrl: string | null;
  additionalImageIds: number[];
  additionalPreviewUrls: string[];
  specialtyDescription: string;
  openingHours: OpeningHoursDto[];
  tags: string[];
  ttsText: string;
  viAudioFileId: number | null;
  enAudioFileId: number | null;
  viAudioUrl: string | null;
  enAudioUrl: string | null;
}

export const DRAFT_STORAGE_KEY = "ft_shop_create_draft";

export function saveDraft(state: ShopDraftState): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (SSR or quota exceeded)
  }
}

export function loadDraft(): ShopDraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ShopDraftState) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const DEFAULT_DRAFT: ShopDraftState = {
  name: "",
  description: "",
  avatarFileId: null,
  avatarPreviewUrl: null,
  additionalImageIds: [],
  additionalPreviewUrls: [],
  specialtyDescription: "",
  openingHours: Array.from({ length: 7 }, (_, i) => ({
    day: i,
    open: "08:00",
    close: "22:00",
    closed: false,
  })),
  tags: [],
  ttsText: "",
  viAudioFileId: null,
  enAudioFileId: null,
  viAudioUrl: null,
  enAudioUrl: null,
};
