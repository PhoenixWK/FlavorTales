// ── Shared types ──────────────────────────────────────────────────────────────

export interface OpeningHoursDto {
  day: number;      // 0 = Monday … 6 = Sunday
  open: string;     // "HH:mm"
  close: string;    // "HH:mm"
  closed: boolean;
}

export const DAY_LABELS = [
  "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm",
  "Thứ Sáu", "Thứ Bảy", "Chủ Nhật",
] as const;

export const AVAILABLE_TAGS = [
  "Bình dân", "Gia truyền", "Chay", "Hải sản", "Đặc sản vùng miền",
] as const;

// ── Draft state for the 3-step creation wizard ────────────────────────────────

export interface PoiCreateDraft {
  // Step 1: POI location
  poiName: string;
  lat: number | null;
  lng: number | null;
  radius: number;

  // Step 2: Shop info
  shopName: string;
  shopDescription: string;
  avatarFileId: number | null;
  avatarPreviewUrl: string | null;
  additionalImageIds: number[];
  additionalPreviewUrls: string[];
  specialtyDescription: string;
  openingHours: OpeningHoursDto[];
  tags: string[];

  // Step 3: Audio
  viAudioFileId: number | null;
  enAudioFileId: number | null;
  viAudioUrl: string | null;
  enAudioUrl: string | null;
}

export const DRAFT_STORAGE_KEY = "ft_poi_create_draft";

export const DEFAULT_DRAFT: PoiCreateDraft = {
  poiName: "",
  lat: null,
  lng: null,
  radius: 50,
  shopName: "",
  shopDescription: "",
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
  viAudioFileId: null,
  enAudioFileId: null,
  viAudioUrl: null,
  enAudioUrl: null,
};

export function saveDraft(state: PoiCreateDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (SSR or quota exceeded)
  }
}

export function loadDraft(): PoiCreateDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PoiCreateDraft) : null;
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

// ── Boundary constants (mirrors backend poi.yml) ───────────────────────────────
export const BOUNDARY_CENTER: [number, number] = [16.000000, 107.500000];
export const BOUNDARY_RADIUS_M = 1_300_000;

/** Great-circle distance between two [lat, lng] points in metres. */
export function haversineDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
