"use client";

import { useState } from "react";
import Link from "next/link";
import { type AdminShopListItem } from "@/modules/admin/services/adminShopApi";
import { proxyFileUrl } from "@/shared/utils/mediaProxy";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconMapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5 shrink-0 text-orange-400 mt-0.5">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5 shrink-0 text-orange-400">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconReview() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Cover Image ───────────────────────────────────────────────────────────────

function CoverImage({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const proxied = proxyFileUrl(avatarUrl);
  const showImage = !!proxied && !failed;

  return (
    <div className="relative h-44 overflow-hidden bg-linear-to-br from-orange-50 to-amber-100">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied}
          alt={name}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-orange-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs font-medium">No cover image</span>
        </div>
      )}
      {/* bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/30 to-transparent pointer-events-none" />
    </div>
  );
}

// ── AdminPoiCard ──────────────────────────────────────────────────────────────

interface AdminPoiCardProps {
  shop: AdminShopListItem;
}

export default function AdminPoiCard({ shop }: AdminPoiCardProps) {
  // Get the first non-closed opening slot for display
  const firstOpenSlot = shop.openingHours?.find((s) => !s.closed);
  const hoursLabel = firstOpenSlot
    ? `${firstOpenSlot.open} – ${firstOpenSlot.close}`
    : shop.openingHours?.length
    ? "Closed"
    : null;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

      {/* ── Cover Image ── */}
      <div className="relative">
        <CoverImage avatarUrl={shop.avatarUrl} name={shop.name} />

        {/* Pending Review badge — top left */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm bg-amber-400/90 text-white">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-white" />
            Pending Review
          </span>
        </div>

        {/* Shop name overlay — bottom left */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10">
          <p className="text-white font-bold text-[15px] leading-snug line-clamp-1 drop-shadow-sm">
            {shop.name}
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-3">

        {/* POI zone */}
        {shop.poiName && (
          <div className="flex items-start gap-2">
            <IconMapPin />
            <span className="text-xs text-gray-600 leading-snug line-clamp-2">
              {shop.poiName}
            </span>
          </div>
        )}

        <div className="h-px bg-gray-100" />

        {/* Cuisine type + opening hours chips */}
        <div className="flex flex-col gap-1.5">
          {shop.cuisineStyle && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5">
              <span className="text-xs font-medium text-orange-700 truncate leading-none">
                {shop.cuisineStyle}
              </span>
            </div>
          )}
          {hoursLabel && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5">
              <IconClock />
              <span className="text-xs text-orange-900 leading-none">{hoursLabel}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="pt-1 mt-auto">
          <Link
            href={`/admin/pending-reviews/${shop.shopId}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-semibold py-2 transition-colors"
          >
            <IconReview />
            Review Submission
          </Link>
        </div>
      </div>
    </div>
  );
}
