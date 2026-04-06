"use client";

import type { OpeningHoursDto } from "@/modules/shop/types/shop";
import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import ShopBasicInfoSection from "@/modules/shop/components/create/ShopBasicInfoSection";
import ShopImageUpload, { type ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import ShopSpecialtySection from "@/modules/shop/components/create/ShopSpecialtySection";
import ShopAudioSection from "@/modules/shop/components/create/ShopAudioSection";
import type { SupportedLanguage } from "@/modules/audio/services/audioApi";
import StallCoverSection, { type StallType } from "./StallCoverSection";

export interface Step2Errors {
  shopName?: string;
  description?: string;
  avatar?: string;
  additionalImages?: string;
  specialtyDescription?: string;
  tags?: string;
}

interface Props {
  draft: Pick<
    PoiCreateDraft,
    | "shopName"
    | "shopDescription"
    | "avatarPreviewUrl"
    | "additionalPreviewUrls"
    | "specialtyDescription"
    | "openingHours"
    | "tags"
    | "viAudioUrl"
    | "enAudioUrl"
    | "zhAudioUrl"
    | "koAudioUrl"
    | "ruAudioUrl"
    | "jaAudioUrl"
  >;
  errors: Step2Errors;
  additionalSlots: ImageSlot[];
  audioBlobs: Partial<Record<SupportedLanguage, Blob>>;
  onBasicChange: (field: "shopName" | "shopDescription", value: string) => void;
  onAvatarChange: (file: File | null, previewUrl: string | null) => void;
  onAdditionalChange: (slots: ImageSlot[]) => void;
  onSpecialtyChange: (
    field: "specialtyDescription" | "openingHours" | "tags",
    value: string | OpeningHoursDto[] | string[]
  ) => void;
  onAudioGenerated: (language: SupportedLanguage, blob: Blob, blobUrl: string) => void;
  onClearError: (field: keyof Step2Errors) => void;
  onBlurField?: (field: keyof Step2Errors, error: string | undefined) => void;
}

export function validateStep2(
  draft: Pick<PoiCreateDraft, "shopName" | "shopDescription" | "avatarPreviewUrl">
): Step2Errors {
  const errors: Step2Errors = {};

  if (!draft.shopName.trim()) {
    errors.shopName = "Tên gian hàng là bắt buộc.";
  } else if (draft.shopName.trim().length < 3) {
    errors.shopName = "Tên gian hàng phải có ít nhất 3 ký tự.";
  } else if (draft.shopName.trim().length > 100) {
    errors.shopName = "Tên gian hàng không vượt quá 100 ký tự.";
  }

  const plainDesc =
    typeof document !== "undefined"
      ? new DOMParser().parseFromString(draft.shopDescription, "text/html").body
          .innerText
      : draft.shopDescription.replace(/<[^>]*>/g, "");

  if (!plainDesc.trim()) {
    errors.description = "Mô tả giới thiệu là bắt buộc.";
  } else if (plainDesc.trim().length > 500) {
    errors.description = "Mô tả không vượt quá 500 ký tự.";
  }

  if (!draft.avatarPreviewUrl) {
    errors.avatar = "Ảnh đại diện là bắt buộc.";
  }

  return errors;
}

export default function ShopInfoStep({
  draft,
  errors,
  additionalSlots,
  audioBlobs,
  onBasicChange,
  onAvatarChange,
  onAdditionalChange,
  onSpecialtyChange,
  onAudioGenerated,
  onClearError,
  onBlurField,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Cover image + stall name + type */}
      <StallCoverSection
        coverImageUrl={draft.avatarPreviewUrl}
        stallName={draft.shopName}
        stallType={(draft.tags[0] ?? "") as StallType}
        errors={{ coverImage: errors.avatar, stallName: errors.shopName }}
        onCoverImageChange={(file, url) => {
          onAvatarChange(file, url);
          onClearError("avatar");
        }}
        onStallNameChange={(v) => {
          onBasicChange("shopName", v);
          onClearError("shopName");
        }}
        onStallTypeChange={(v) => {
          const rest = draft.tags.slice(1);
          onSpecialtyChange("tags", v ? [v, ...rest] : rest);
        }}
      />

      {/* Shop description */}
      <ShopBasicInfoSection
        name={draft.shopName}
        description={draft.shopDescription}
        showName={false}
        errors={{ description: errors.description }}
        maxDescChars={500}
        showRemaining
        onChange={(field, value) => {
          if (field === "description") {
            onBasicChange("shopDescription", value);
            onClearError("description");
          }
        }}
        onBlurDescription={() => {
          const plain =
            typeof document !== "undefined"
              ? new DOMParser().parseFromString(draft.shopDescription, "text/html").body.innerText
              : draft.shopDescription.replace(/<[^>]*>/g, "");
          if (!plain.trim()) onBlurField?.("description", "Mô tả giới thiệu là bắt buộc.");
          else if (plain.trim().length > 500) onBlurField?.("description", "Mô tả không vượt quá 500 ký tự.");
          else onBlurField?.("description", undefined);
        }}
      />

      {/* Gallery images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Images{" "}
          <span className="text-gray-400 font-normal">(optional, up to 4)</span>
        </label>
        <ShopImageUpload
          avatarPreviewUrl={draft.avatarPreviewUrl}
          additionalSlots={additionalSlots}
          showAvatar={false}
          maxAdditional={4}
          errors={{ additionalImages: errors.additionalImages }}
          onAvatarChange={onAvatarChange}
          onAdditionalChange={onAdditionalChange}
        />
      </div>

      {/* Specialty + opening hours + tags */}
      <ShopSpecialtySection
        specialtyDescription={draft.specialtyDescription}
        openingHours={draft.openingHours}
        tags={draft.tags}
        showTags={false}
        errors={{
          specialtyDescription: errors.specialtyDescription,
          tags: errors.tags,
        }}
        onChange={onSpecialtyChange}
      />

      {/* Audio narration */}
      <ShopAudioSection
        audioUrls={{
          vi: draft.viAudioUrl,
          en: draft.enAudioUrl,
          zh: draft.zhAudioUrl,
          ko: draft.koAudioUrl,
          ru: draft.ruAudioUrl,
          ja: draft.jaAudioUrl,
        }}
        audioBlobs={audioBlobs}
        maxTtsChars={2000}
        onAudioGenerated={onAudioGenerated}
      />
    </div>
  );
}
