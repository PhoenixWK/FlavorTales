// ── Types for tourist-facing map view ─────────────────────────────────────────

import type { OpeningHoursDto } from "@/modules/poi/types/poi";

export interface TouristPoi {
  poiId: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address?: string | null;
  linkedShopId: number | null;
  linkedShopName: string | null;
  linkedShopAvatarUrl: string | null;
  /** Whether this POI has at least one active (approved) audio. Resolved lazily. */
  hasApprovedAudio?: boolean;
  /** Cumulative tourist like count (FR-LM-007 overlap scoring). */
  likesCount?: number;
  /** Shop tags (e.g. ["Hải sản","Bình dân"]), null when POI has no linked shop. */
  shopTags?: string[] | null;
  shopDescription?: string | null;
  shopOpeningHours?: OpeningHoursDto[] | null;
  /** Gallery images from shop_image table (ordered by sort_order). */
  shopGalleryUrls?: string[] | null;
}

export interface TouristPoiAudio {
  audioId: number;
  languageCode: string;
  fileUrl: string;
  status: string;
}

/** UI state of a single marker */
export type MarkerState = "default" | "selected" | "visited";
