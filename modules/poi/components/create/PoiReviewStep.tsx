"use client";

import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import type { ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import type { SupportedLanguage } from "@/modules/audio/services/audioApi";
import ViewSection from "@/modules/poi/components/view/ViewSection";
import PoiViewLocationSection from "@/modules/poi/components/view/PoiViewLocationSection";
import PoiViewCoverSection from "@/modules/poi/components/view/PoiViewCoverSection";
import PoiViewInfoSection from "@/modules/poi/components/view/PoiViewInfoSection";
import PoiViewGallerySection from "@/modules/poi/components/view/PoiViewGallerySection";

interface Props {
  draft: PoiCreateDraft;
  additionalSlots: ImageSlot[];
  audioBlobs: Partial<Record<SupportedLanguage, Blob>>;
}

function IconMusicNote() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-8 h-8 text-orange-300"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  );
}

export default function PoiReviewStep({ draft, additionalSlots, audioBlobs }: Props) {
  const audioCount = Object.keys(audioBlobs).length;
  const galleryUrls = additionalSlots.length > 0
    ? additionalSlots.map((s) => s.previewUrl)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden divide-y divide-gray-100">
      {/* ── Vị trí POI ─────────────────────────────────────────────────────── */}
      <ViewSection title="Vị trí POI">
        <PoiViewLocationSection
          lat={draft.lat!}
          lng={draft.lng!}
          name={draft.poiName}
          radius={draft.radius}
        />
      </ViewSection>

      {/* ── Thông tin cơ bản ────────────────────────────────────────────────── */}
      <ViewSection title="Thông tin cơ bản">
        <PoiViewCoverSection
          avatarUrl={draft.avatarPreviewUrl}
          name={draft.shopName}
        />
      </ViewSection>

      {/* ── Mô tả & Hình ảnh ────────────────────────────────────────────────── */}
      <ViewSection title="Mô tả & Hình ảnh">
        <div className="space-y-5">
          <PoiViewInfoSection
            description={draft.shopDescription || null}
            featuredDish={draft.specialtyDescription || null}
            openingHours={draft.openingHours}
            tags={draft.tags.length > 0 ? draft.tags : null}
          />
          <PoiViewGallerySection galleryUrls={galleryUrls} name={draft.shopName} />
        </div>
      </ViewSection>

      {/* ── Audio Narration ─────────────────────────────────────────────────── */}
      <ViewSection title="Audio Narration">
        {audioCount > 0 ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
              <IconMusicNote />
            </div>
            <p className="text-sm font-semibold text-emerald-700">
              {audioCount} ngôn ngữ đã tạo
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50">
            <IconMusicNote />
            <p className="text-sm text-gray-400">Chưa có audio narration</p>
          </div>
        )}
      </ViewSection>
    </div>
  );
}

