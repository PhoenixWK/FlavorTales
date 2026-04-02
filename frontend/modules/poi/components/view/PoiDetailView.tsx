"use client";

import { useState } from "react";
import type { PoiResponse } from "@/modules/poi/services/poiApi";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import type { TranslationLanguage } from "@/shared/components/LanguageSwitcher";
import { usePoiViewTranslation } from "@/modules/poi/hooks/usePoiViewTranslation";
import PoiViewLanguageBar from "./PoiViewLanguageBar";
import PoiStatusBanner from "./PoiStatusBanner";
import ViewSection from "./ViewSection";
import PoiViewLocationSection from "./PoiViewLocationSection";
import PoiViewCoverSection from "./PoiViewCoverSection";
import PoiViewInfoSection from "./PoiViewInfoSection";
import PoiViewGallerySection from "./PoiViewGallerySection";
import PoiViewAudioSection from "./PoiViewAudioSection";

interface Props {
  poi: PoiResponse;
  shop: ShopDetail;
}

/** Read-only detail view for a vendor's POI — single unified card, full width. */
export default function PoiDetailView({ poi, shop }: Props) {
  const [lang, setLang] = useState<TranslationLanguage>("vi");
  const { displayPoi, displayShop, translationLoading } = usePoiViewTranslation(poi, shop, lang);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden divide-y divide-gray-100">
        <PoiViewLanguageBar lang={lang} onChange={setLang} loading={translationLoading} />
        <PoiStatusBanner status={poi.status ?? ""} />
      </div>

      <ViewSection title="Location & Contact">
        <PoiViewLocationSection
          lat={displayPoi.latitude}
          lng={displayPoi.longitude}
          name={displayPoi.name}
          radius={displayPoi.radius}
          address={displayPoi.address}
        />
      </ViewSection>

      <ViewSection title="Basic Information">
        <PoiViewCoverSection avatarUrl={displayShop.avatarUrl} name={displayShop.name} />
      </ViewSection>

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

      <ViewSection title="Audio Narration">
        <PoiViewAudioSection shopId={displayShop.shopId} initialLanguage={lang !== "vi" ? lang : undefined} />
      </ViewSection>
    </div>
  );
}

