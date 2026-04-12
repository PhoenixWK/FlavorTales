"use client";

import { useEffect, useRef, useState } from "react";
import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import type { SupportedLanguage } from "@/modules/audio/services/audioApi";
import type { PoiLanguageResult, ShopLanguageResult } from "@/modules/poi/services/translationApi";
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
  onEdit?: (step: number) => void;
  poiTranslations?: PoiLanguageResult[];
  shopTranslations?: ShopLanguageResult[];
}

const AUDIO_LANG_TO_TRANSLATION: Record<string, string> = {
  en: "english",
  ko: "korean",
  zh: "chinese",
  ru: "russian",
  ja: "japanese",
};

export default function PoiReviewStep({ draft, imageFiles, audioBlobs, onEdit, poiTranslations, shopTranslations }: Props) {
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
      <ViewSection
        title="Vị trí POI"
        action={onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"
          >
            ✏️ Chỉnh sửa
          </button>
        ) : undefined}
      >
        <PoiViewLocationSection
          lat={draft.lat!}
          lng={draft.lng!}
          name={draft.poiName}
          radius={draft.radius}
        />
      </ViewSection>

      {/* ── Thông tin cơ bản ────────────────────────────────────────────────── */}
      <ViewSection
        title="Thông tin cơ bản"
        action={onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(2)}
            className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"
          >
            ✏️ Chỉnh sửa
          </button>
        ) : undefined}
      >
        <PoiViewCoverSection
          avatarUrl={avatarUrl}
          name={(() => {
            if (selectedLang !== "vi") {
              const key = AUDIO_LANG_TO_TRANSLATION[selectedLang];
              const poiTrans = poiTranslations?.find((r) => r.language === key);
              if (poiTrans?.success && poiTrans.translatedName) return poiTrans.translatedName;
            }
            return draft.shopName;
          })()}
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
          ) : (() => {
            const key = AUDIO_LANG_TO_TRANSLATION[selectedLang];
            const shopTrans = shopTranslations?.find((r) => r.language === key);
            if (shopTrans?.success) {
              return (
                <PoiViewInfoSection
                  description={shopTrans.translatedDescription || null}
                  featuredDish={shopTrans.translatedFeaturedDish || null}
                  openingHours={draft.openingHours}
                  tags={draft.tags.length > 0 ? draft.tags : null}
                />
              );
            }
            return (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-500 text-lg shrink-0">⚠</span>
                <p className="text-sm text-amber-700">
                  Chưa có bản dịch cho <strong>{LANG_LABELS[selectedLang]}</strong>. Vui lòng hoàn tất bước dịch trước.
                </p>
              </div>
            );
          })()}
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

