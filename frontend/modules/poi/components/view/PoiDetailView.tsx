"use client";

import { useState, useEffect } from "react";
import type { PoiResponse } from "@/modules/poi/services/poiApi";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import PoiViewCoverSection from "./PoiViewCoverSection";
import PoiViewInfoSection from "./PoiViewInfoSection";
import PoiViewGallerySection from "./PoiViewGallerySection";
import PoiViewAudioSection from "./PoiViewAudioSection";
import PoiViewLocationSection from "./PoiViewLocationSection";
import ViewSection from "./ViewSection";
import LanguageSwitcher, {
  type TranslationLanguage,
} from "@/shared/components/LanguageSwitcher";
import {
  getPoiTranslation,
  getShopTranslation,
} from "@/modules/poi/services/translationApi";

interface Props {
  poi: PoiResponse;
  shop: ShopDetail;
}

/** Read-only detail view for a vendor's POI — single unified card, full width. */
export default function PoiDetailView({ poi, shop }: Props) {
  const [lang, setLang] = useState<TranslationLanguage>("vi");
  const [displayPoi, setDisplayPoi] = useState<PoiResponse>(poi);
  const [displayShop, setDisplayShop] = useState<ShopDetail>(shop);
  const [translationLoading, setTranslationLoading] = useState(false);

  useEffect(() => {
    if (lang === "vi") {
      setDisplayPoi(poi);
      setDisplayShop(shop);
      return;
    }
    let cancelled = false;
    setTranslationLoading(true);
    Promise.all([
      getPoiTranslation(poi.poiId, lang),
      getShopTranslation(shop.shopId, lang),
    ])
      .then(([poiTrans, shopTrans]) => {
        if (cancelled) return;
        if (poiTrans) {
          setDisplayPoi((prev) => ({
            ...prev,
            name: poiTrans.name ?? prev.name,
            address: poiTrans.address ?? prev.address,
          }));
        }
        if (shopTrans) {
          setDisplayShop((prev) => ({
            ...prev,
            name: shopTrans.name ?? prev.name,
            description: shopTrans.description ?? prev.description,
            featuredDish: shopTrans.featuredDish ?? prev.featuredDish,
            cuisineStyle: shopTrans.cuisineStyle ?? prev.cuisineStyle,
          }));
        }
      })
      .catch(() => {/* keep original data on error */})
      .finally(() => {
        if (!cancelled) setTranslationLoading(false);
      });
    return () => { cancelled = true; };
  }, [lang, poi, shop]);

  const status = poi.status?.toLowerCase();
  const isPending = status === "pending";
  const isActive = status === "active";

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden divide-y divide-gray-100">
      {/* Language switcher */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 shrink-0">Language:</span>
        <LanguageSwitcher selected={lang} onChange={setLang} />
        {translationLoading && (
          <span className="text-xs text-gray-400 ml-auto">Loading translation…</span>
        )}
      </div>
      {/* Active banner */}
      {isActive && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-4 flex gap-3">
          <div className="shrink-0 mt-0.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-emerald-500"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">POI đang hoạt động</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              POI của bạn đang hoạt động và hiển thị với người dùng. Bấm{" "}
              <span className="font-medium">Edit POI</span> nếu bạn muốn chỉnh sửa thông tin.
            </p>
          </div>
        </div>
      )}

      {/* Pending review banner */}
      {isPending && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-4 flex gap-3">
          <div className="shrink-0 mt-0.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-amber-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Under Review</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your POI is currently being reviewed by our team. You can view your
              submission below but cannot make changes until review is complete.
            </p>
          </div>
        </div>
      )}

      {/* Location & Contact */}
      <ViewSection title="Location & Contact">
        <PoiViewLocationSection
          lat={displayPoi.latitude}
          lng={displayPoi.longitude}
          name={displayPoi.name}
          radius={displayPoi.radius}
          address={displayPoi.address}
        />
      </ViewSection>

      {/* Basic Information */}
      <ViewSection title="Basic Information">
        <PoiViewCoverSection
          avatarUrl={displayShop.avatarUrl}
          name={displayShop.name}
        />
      </ViewSection>

      {/* Description & Media */}
      <ViewSection title="Description & Media">
        <div className="space-y-5">
          <PoiViewInfoSection
            description={displayShop.description}
            featuredDish={displayShop.featuredDish}
            openingHours={displayShop.openingHours}
            tags={displayShop.tags}
          />
          <PoiViewGallerySection galleryUrls={displayShop.galleryUrls} name={displayShop.name} />
        </div>
      </ViewSection>

      {/* Audio Narration */}
      <ViewSection title="Audio Narration">
        <PoiViewAudioSection shopId={displayShop.shopId} initialLanguage={lang !== "vi" ? lang : undefined} />
      </ViewSection>
    </div>
  );
}
