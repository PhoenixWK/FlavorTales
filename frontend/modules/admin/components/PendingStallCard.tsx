"use client";

import { useState } from "react";
import Link from "next/link";
import { type AdminShopListItem, type OpeningHourSlot } from "@/modules/admin/services/adminShopApi";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconMapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3 h-3 flex-shrink-0">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3 h-3 flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconKebab() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="w-3.5 h-3.5">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-300">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHours(slots: OpeningHourSlot[] | null): string | null {
  if (!slots || slots.length === 0) return null;
  const open = slots.find((s) => !s.closed);
  if (!open) return "Closed";
  return `${open.open} - ${open.close}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StallCardImage({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  return (
    <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <IconImage />
        </div>
      )}
    </div>
  );
}

function StallTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <span className="inline-block text-[11px] font-semibold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full border border-orange-100">
      {type}
    </span>
  );
}

function StallMeta({
  poiId,
  poiName,
  hours,
}: {
  poiId: number | null;
  poiName: string | null;
  hours: string | null;
}) {
  const locationLabel = poiName ?? (poiId != null ? `#${poiId}` : null);
  if (!locationLabel && !hours) return null;
  return (
    <div className="flex items-center gap-2.5 text-[11px] text-gray-400 flex-wrap">
      {locationLabel && (
        <span className="flex items-center gap-1">
          <IconMapPin />
          <span className="truncate max-w-[100px]">{locationLabel}</span>
        </span>
      )}
      {hours && (
        <span className="flex items-center gap-1">
          <IconClock />
          <span>{hours}</span>
        </span>
      )}
    </div>
  );
}

// ── PendingStallCard ──────────────────────────────────────────────────────────

interface PendingStallCardProps {
  shop: AdminShopListItem;
}

export default function PendingStallCard({ shop }: PendingStallCardProps) {
  const hours = formatHours(shop.openingHours);

  return (
    <Link
      href={`/admin/pending-reviews/${shop.shopId}`}
      className="group block bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <StallCardImage avatarUrl={shop.avatarUrl} name={shop.name} />

      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1">{shop.name}</p>
          <button
            onClick={(e) => e.preventDefault()}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition p-0.5 -mr-0.5 rounded"
            aria-label="More options"
          >
            <IconKebab />
          </button>
        </div>

        <StallTypeBadge type={shop.cuisineStyle} />
        <StallMeta poiId={shop.poiId} poiName={shop.poiName} hours={hours} />
      </div>
    </Link>
  );
}

