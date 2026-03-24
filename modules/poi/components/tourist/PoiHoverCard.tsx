"use client";

import Image from "next/image";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import { getOpenStatus } from "@/modules/poi/utils/openStatusUtils";
import { IconAudio } from "@/modules/poi/components/tourist/poiIcons";

interface Props {
  poi: TouristPoi;
  /** Viewport pixel position of the marker tip (from Leaflet containerPoint + rect). */
  position: { x: number; y: number };
}

/**
 * Compact preview card shown on marker hover (desktop only).
 * Styled like the reference card image — image at top, name, type, status, audio indicator.
 */
export default function PoiHoverCard({ poi, position }: Props) {
  const status = getOpenStatus(poi.shopOpeningHours);
  const name   = poi.linkedShopName ?? poi.name;
  const typeLabel = poi.shopTags?.join(" • ");

  // Extract the time part from status label e.g. "Đã đóng • Mở lúc 08:00" → "Mở lúc 08:00"
  const statusDetail = status?.label.split("•")[1]?.trim();

  return (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y - 12,
        transform: "translate(-50%, -100%)",
        zIndex: 1150,
        pointerEvents: "none",
      }}
      className="
        hidden [@media(hover:hover)]:block
        w-64 bg-white rounded-2xl shadow-xl border border-gray-100
        overflow-hidden
      "
    >
      {/* Hero photo */}
      <div className="w-full h-36 bg-gray-100 relative overflow-hidden">
        {poi.linkedShopAvatarUrl ? (
          <Image
            src={poi.linkedShopAvatarUrl}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-orange-50">
            <svg className="h-12 w-12 text-orange-200" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="font-bold text-[15px] text-gray-900 leading-snug line-clamp-2">{name}</p>

        {/* Type */}
        {typeLabel && (
          <p className="text-xs text-gray-500 truncate">{typeLabel}</p>
        )}

        {/* Status */}
        {status && (
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className={status.open ? "font-semibold text-green-600" : "font-semibold text-red-500"}>
              {status.open ? "Đang mở" : "Đã đóng"}
            </span>
            {statusDetail && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{statusDetail}</span>
              </>
            )}
          </div>
        )}

        {/* Audio indicator */}
        {poi.hasApprovedAudio && (
          <div className="flex items-center gap-1 text-xs text-orange-500 font-medium mt-0.5">
            <IconAudio className="h-3.5 w-3.5" />
            <span>Có thuyết minh</span>
          </div>
        )}
      </div>
    </div>
  );
}

