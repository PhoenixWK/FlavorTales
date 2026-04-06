"use client";

import { useEffect, useRef, useState } from "react";
import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import type { SupportedLanguage } from "@/modules/audio/services/audioApi";
import ViewSection from "@/modules/poi/components/view/ViewSection";
import PoiViewLocationSection from "@/modules/poi/components/view/PoiViewLocationSection";
import PoiViewCoverSection from "@/modules/poi/components/view/PoiViewCoverSection";
import PoiViewInfoSection from "@/modules/poi/components/view/PoiViewInfoSection";
import PoiViewGallerySection from "@/modules/poi/components/view/PoiViewGallerySection";
import ReviewAudioSection, { LANG_LABELS, LANG_ORDER } from "./ReviewAudioSection";

interface Props {
  draft: PoiCreateDraft;
  imageFiles: { avatar: File | null; additional: File[] };
  audioBlobs: Partial<Record<SupportedLanguage, Blob>>;
}

export default function PoiReviewStep({ draft, imageFiles, audioBlobs }: Props) {
  const blobUrlsRef = useRef<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[] | null>(null);

  const availableLangs = LANG_ORDER.filter((l) => !!audioBlobs[l]);
  const [selectedLang, setSelectedLang] = useState<(typeof LANG_ORDER)[number]>(
    availableLangs[0] ?? "vi"
  );

  // Create fresh blob URLs from File objects so previews work regardless of prior revocations.
  useEffect(() => {
    const created: string[] = [];

    if (imageFiles.avatar) {
      const url = URL.createObjectURL(imageFiles.avatar);
      created.push(url);
      setAvatarUrl(url);
    } else {
      setAvatarUrl(draft.avatarPreviewUrl);
    }

    if (imageFiles.additional.length > 0) {
      const urls = imageFiles.additional.map((f) => {
        const url = URL.createObjectURL(f);
        created.push(url);
        return url;
      });
      setGalleryUrls(urls);
    }

    blobUrlsRef.current = created;
    return () => { created.forEach((u) => URL.revokeObjectURL(u)); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden divide-y divide-gray-100">
      {/* ── Ngôn ngữ xem lại ──────────────────────────────────────────────── */}
      {availableLangs.length > 0 && (
        <ViewSection title="Ngôn ngữ xem lại">
          <div className="flex flex-wrap gap-2">
            {availableLangs.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                  ${selectedLang === lang
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                  }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </ViewSection>
      )}

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
          avatarUrl={avatarUrl}
          name={draft.shopName}
        />
      </ViewSection>

      {/* ── Mô tả & Hình ảnh ────────────────────────────────────────────────── */}
      <ViewSection title="Mô tả & Hình ảnh">
        <div className="space-y-5">
          {selectedLang === "vi" ? (
            <PoiViewInfoSection
              description={draft.shopDescription || null}
              featuredDish={draft.specialtyDescription || null}
              openingHours={draft.openingHours}
              tags={draft.tags.length > 0 ? draft.tags : null}
            />
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-500 text-lg shrink-0">🔄</span>
              <p className="text-sm text-amber-700">
                Bản dịch sang <strong>{LANG_LABELS[selectedLang]}</strong> sẽ có ngay sau khi POI được gửi duyệt.
              </p>
            </div>
          )}
          <PoiViewGallerySection galleryUrls={galleryUrls} name={draft.shopName} />
        </div>
      </ViewSection>

      {/* ── Audio Narration ─────────────────────────────────────────────────── */}
      <ViewSection title="Audio Narration">
        <ReviewAudioSection
          audioBlobs={audioBlobs}
          selectedLang={selectedLang}
          onLangChange={setSelectedLang}
        />
      </ViewSection>
    </div>
  );
}

