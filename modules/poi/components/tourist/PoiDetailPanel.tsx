"use client";

import { useEffect, useMemo, useState } from "react";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";
import { getOpenStatus } from "@/modules/poi/utils/openStatusUtils";
import PoiSearchBar from "@/modules/poi/components/tourist/PoiSearchBar";
import { IconAudio, IconDirections, IconClose, IconPin, IconGlobe } from "@/modules/poi/components/tourist/poiIcons";
import { ShopCategoryBadge } from "@/modules/poi/components/tourist/shopCategoryIcon";
import PoiImageCarousel from "@/modules/poi/components/tourist/PoiImageCarousel";
import PoiImageLightbox from "@/modules/poi/components/tourist/PoiImageLightbox";

// ── Distance helper ───────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  poi: TouristPoi;
  userCoordinates: UserCoordinates | null;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Left-side detail panel shown when user clicks a POI marker.
 * - Desktop: fixed left overlay (w-96), full-height, slide-in from left.
 * - Mobile: fixed bottom sheet, slides up to 85vh.
 */
export default function PoiDetailPanel({
  poi,
  userCoordinates,
  onClose,
  searchQuery,
  onSearchChange,
}: Props) {
  const name   = poi.linkedShopName ?? poi.name;
  const status = getOpenStatus(poi.shopOpeningHours);

  const distanceMetres = userCoordinates
    ? haversineDistance(userCoordinates.latitude, userCoordinates.longitude, poi.latitude, poi.longitude)
    : null;

  const userInsideRadius = distanceMetres !== null && distanceMetres <= poi.radius;
  const canHearStory     = userInsideRadius && poi.hasApprovedAudio === true;

  const directionsUrl = `https://www.openstreetmap.org/directions?from=&to=${poi.latitude},${poi.longitude}`;

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Merge avatar (first) + gallery images for the carousel
  const carouselImages = useMemo(() => {
    const imgs: string[] = [];
    if (poi.linkedShopAvatarUrl) imgs.push(poi.linkedShopAvatarUrl);
    if (poi.shopGalleryUrls?.length) imgs.push(...poi.shopGalleryUrls);
    return imgs;
  }, [poi.linkedShopAvatarUrl, poi.shopGalleryUrls]);

  // Close on Escape (let lightbox handle its own)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && lightboxIndex === null) onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, lightboxIndex]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-1100" aria-hidden="true" onClick={onClose} />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="
          fixed z-1200 bg-white shadow-2xl flex flex-col
          bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
          sm:bottom-0 sm:top-0 sm:right-auto sm:left-0 sm:w-96 sm:max-h-full sm:rounded-none
          animate-slide-in-left
        "
      >
        {/* ── Sticky header: search + close ─────────────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-2 border-b border-gray-100 flex items-center gap-2">
          <PoiSearchBar
            value={searchQuery}
            onChange={onSearchChange}
            className="flex-1"
          />
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* Image carousel / placeholder */}
          {carouselImages.length > 0 ? (
            <PoiImageCarousel
              images={carouselImages}
              name={name}
              onImageClick={setLightboxIndex}
            />
          ) : (
            <div className="w-full h-48 bg-orange-50 flex items-center justify-center shrink-0">
              <svg className="h-16 w-16 text-orange-200" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
          )}

          <div className="px-4 py-4 flex flex-col gap-3">
            {/* Name */}
            <h2 className="font-bold text-xl text-gray-900 leading-snug">{name}</h2>

            {/* Category badge + type + status */}
            <div className="flex items-start gap-3">
              <ShopCategoryBadge tags={poi.shopTags} />
              <div className="flex flex-col gap-1 min-w-0">
                {poi.shopTags && poi.shopTags.length > 0 && (
                  <p className="text-sm text-gray-500">{poi.shopTags.join(" • ")}</p>
                )}
                {status && (
                  <div className="flex items-center gap-1.5 text-sm flex-wrap">
                    <span className={status.open ? "font-semibold text-green-600" : "font-semibold text-red-500"}>
                      {status.open ? "Đang mở" : "Đã đóng"}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{status.label.split("•")[1]?.trim()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {/* Audio — shown always, disabled when not available */}
              <button
                disabled={!canHearStory}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors
                  bg-blue-600 hover:bg-blue-700 text-white
                  disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <IconAudio className="h-4 w-4 shrink-0" />
                Nghe thuyết minh
              </button>

              {/* Directions */}
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm py-3 transition-colors text-center"
              >
                <IconDirections className="h-4 w-4 shrink-0" />
                Chỉ đường nhanh nhất
              </a>
            </div>

            {/* ── Info rows ─────────────────────────────────────────────── */}
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
              {/* Address */}
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <IconPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <span>{poi.name}</span>
              </div>

              {/* Website — only render when field is present */}
              {(poi as { shopWebsite?: string | null }).shopWebsite && (
                <div className="flex items-center gap-3 text-sm">
                  <IconGlobe className="h-4 w-4 shrink-0 text-gray-400" />
                  <a
                    href={(poi as { shopWebsite?: string }).shopWebsite!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {(poi as { shopWebsite?: string }).shopWebsite}
                  </a>
                </div>
              )}

              {/* Description */}
              {poi.shopDescription && (
                <p className="text-sm text-gray-500 leading-relaxed">{poi.shopDescription}</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PoiImageLightbox
          images={carouselImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
