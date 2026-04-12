/**
 * Maps POI shop tags to their display colours on the tourist map.
 *
 * Rationale for each colour:
 *   Bình dân      → orange  — everyday dining (warm, inviting)
 *   Gia truyền    → red     — heritage/traditional (strong, nostalgic)
 *   Chay          → green   — vegetarian (natural, fresh)
 *   Hải sản       → blue    — seafood / water-related
 *   Đặc sản       → purple  — regional specialty (premium, distinctive)
 *   fallback      → orange  — generic food place
 */
export const TAG_COLORS: Record<string, string> = {
  "Bình dân":           "#F97316", // orange-500
  "Gia truyền":         "#DC2626", // red-600
  "Chay":               "#16A34A", // green-600
  "Hải sản":            "#0284C7", // sky-600
  "Đặc sản vùng miền": "#7C3AED", // violet-700
};

export const FALLBACK_COLOR = "#F97316";

/**
 * Returns the display colour for a POI based on its first shop tag.
 * Falls back to the generic orange if the tag is unknown or absent.
 */
export function getTagColor(tags: string[] | null | undefined): string {
  if (tags && tags.length > 0) {
    const match = TAG_COLORS[tags[0]];
    if (match) return match;
  }
  return FALLBACK_COLOR;
}
