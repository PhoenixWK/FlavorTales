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
import { useTranslation } from "@/shared/i18n/useTranslation";
import { haversineMetres } from "@/modules/location/utils/geoMath";
import { useGeofenceContext } from "@/modules/location/context/GeofenceContext";
import { useAudioContext } from "@/modules/audio/context/AudioContext";
import { useAnonymousSession } from "@/modules/location/hooks/useAnonymousSession";
import { likePoiApi, unlikePoiApi } from "@/modules/poi/services/touristPoiApi";

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
  const t = useTranslation();

  // ── Geofence + audio context ──────────────────────────────────────
  const { resolvedPoiId, isResolving, insidePois } = useGeofenceContext();
  const { playState, currentPoiId, play, pause, playForPoi } = useAudioContext();
  const { sessionId } = useAnonymousSession();

  const distanceMetres = userCoordinates
    ? haversineMetres(userCoordinates.latitude, userCoordinates.longitude, poi.latitude, poi.longitude)
    : null;

  const isThisPoiResolved = resolvedPoiId === poi.poiId;
  const isInsideThisPoi   = insidePois.includes(poi.poiId);
  const isPlayingThis     = currentPoiId === poi.poiId;

  // Derive audio button state
  type AudioBtnState = "resolving" | "playing" | "inactive";
  const audioBtnState: AudioBtnState =
    isResolving && insidePois.length > 1 && isInsideThisPoi
    ? "resolving"
    : isThisPoiResolved || isPlayingThis
    ? "playing"
    : "inactive";

  // True while audio is actively loading/playing/finishing — used to prevent spam
  const isAudioBusy = playState === "playing" || playState === "loading" || playState === "finishing";

  // ── Like state (optimistic) ──────────────────────────────────────
  const LIKED_KEY = "ft_liked_pois";
  function readLiked(): Set<number> {
    try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]")); }
    catch { return new Set(); }
  }
  function writeLiked(s: Set<number>) {
    try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
  }

  const [liked, setLiked] = useState(() => readLiked().has(poi.poiId));
  const [likesCount, setLikesCount] = useState(poi.likesCount ?? 0);

  const handleLike = async () => {
    if (!sessionId) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((c) => nextLiked ? c + 1 : Math.max(c - 1, 0));
    const s = readLiked();
    if (nextLiked) { s.add(poi.poiId); } else { s.delete(poi.poiId); }
    writeLiked(s);
    try {
      const updated = await (nextLiked
        ? likePoiApi(poi.poiId, sessionId)
        : unlikePoiApi(poi.poiId, sessionId));
      setLikesCount(updated);
    } catch {
      // Revert on failure
      setLiked(!nextLiked);
      setLikesCount((c) => !nextLiked ? c + 1 : Math.max(c - 1, 0));
      const s2 = readLiked();
      if (!nextLiked) { s2.add(poi.poiId); } else { s2.delete(poi.poiId); }
      writeLiked(s2);
    }
  };

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
            onChange={onSearchChange}              placeholder={t("poi.search_placeholder")}            className="flex-1"
          />
          <button
            onClick={onClose}
            aria-label={t("poi.close")}
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
            {/* Name + inline like */}
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-xl text-gray-900 leading-snug flex-1">{name}</h2>
              <button
                onClick={handleLike}
                disabled={!sessionId}
                aria-label={liked ? "Bỏ yêu thích" : "Yêu thích"}
                className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors
                  ${liked ? "border-red-300 bg-red-50 text-red-600" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"}
                  stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>
            </div>

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
                      {status.open ? t("poi.open") : t("poi.closed")}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{status.label.split("•")[1]?.trim()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {/* Audio button — triggers floating AudioPlayerBar */}
              <button
                  onClick={() => {
                    if (isPlayingThis && playState === "playing") pause();
                    else if (isThisPoiResolved) play();
                    else playForPoi(poi.poiId);
                  }}
                  disabled={audioBtnState === "resolving" || isAudioBusy}
                  title={audioBtnState === "inactive" ? "Nhấn để phát thuyết minh" : undefined}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                    ${
                      audioBtnState === "playing"
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : audioBtnState === "resolving"
                        ? "bg-blue-100 text-blue-400 cursor-wait"
                        : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200"
                    }`}
                >
                  {audioBtnState === "resolving" ? (
                    <span className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  ) : (
                    <IconAudio className="h-4 w-4 shrink-0" />
                  )}
                  {audioBtnState === "resolving"
                    ? "Đang phân tích…"
                    : isPlayingThis && playState === "playing"
                    ? "Đang phát"
                    : playState === "loading" && isPlayingThis
                    ? "Đang tải…"
                    : isAudioBusy
                    ? "Đang phát..."
                    : t("poi.hear_story")}
                </button>

              {/* Directions */}
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm py-3 transition-colors text-center"
              >
                <IconDirections className="h-4 w-4 shrink-0" />
                {t("poi.directions")}
              </a>
            </div>

            {/* ── Info rows ─────────────────────────────────────────────── */}
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
              {/* Address */}
              {poi.address && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <IconPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                  <span>{poi.address}</span>
                </div>
              )}

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
