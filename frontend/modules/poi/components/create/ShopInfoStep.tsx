"use client";

import type { OpeningHoursDto } from "@/modules/shop/types/shop";
import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import ShopBasicInfoSection from "@/modules/shop/components/create/ShopBasicInfoSection";
import ShopImageUpload, { type ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import ShopSpecialtySection from "@/modules/shop/components/create/ShopSpecialtySection";

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
  >;
  errors: Step2Errors;
  additionalSlots: ImageSlot[];
  onBasicChange: (field: "shopName" | "shopDescription", value: string) => void;
  onAvatarChange: (file: File | null, previewUrl: string | null) => void;
  onAdditionalChange: (slots: ImageSlot[]) => void;
  onSpecialtyChange: (
    field: "specialtyDescription" | "openingHours" | "tags",
    value: string | OpeningHoursDto[] | string[]
  ) => void;
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
  onBasicChange,
  onAvatarChange,
  onAdditionalChange,
  onSpecialtyChange,
  onClearError,
  onBlurField,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Shop name + description */}
      <ShopBasicInfoSection
        name={draft.shopName}
        description={draft.shopDescription}
        errors={{ name: errors.shopName, description: errors.description }}
        maxDescChars={500}
        showRemaining
        onChange={(field, value) => {
          onBasicChange(field === "name" ? "shopName" : "shopDescription", value);
          onClearError(field === "name" ? "shopName" : "description");
        }}
        onBlurName={() => {
          const v = draft.shopName.trim();
          if (!v) onBlurField?.("shopName", "Tên gian hàng là bắt buộc.");
          else if (v.length < 3) onBlurField?.("shopName", "Tên gian hàng phải có ít nhất 3 ký tự.");
          else if (v.length > 100) onBlurField?.("shopName", "Tên gian hàng không vượt quá 100 ký tự.");
          else onBlurField?.("shopName", undefined);
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

      {/* Images */}
      <ShopImageUpload
        avatarPreviewUrl={draft.avatarPreviewUrl}
        additionalSlots={additionalSlots}
        maxAdditional={4}
        errors={{ avatar: errors.avatar, additionalImages: errors.additionalImages }}
        onAvatarChange={(file, url) => {
          onAvatarChange(file, url);
          onClearError("avatar");
        }}
        onAdditionalChange={onAdditionalChange}
      />

      {/* Specialty + opening hours + tags */}
      <ShopSpecialtySection
        specialtyDescription={draft.specialtyDescription}
        openingHours={draft.openingHours}
        tags={draft.tags}
        errors={{
          specialtyDescription: errors.specialtyDescription,
          tags: errors.tags,
        }}
        onChange={onSpecialtyChange}
      />
    </div>
  );
}
