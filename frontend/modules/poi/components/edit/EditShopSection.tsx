"use client";

import type { OpeningHoursDto } from "@/modules/shop/types/shop";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import type { ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import ShopBasicInfoSection from "@/modules/shop/components/create/ShopBasicInfoSection";
import ShopImageUpload from "@/modules/shop/components/create/ShopImageUpload";
import ShopSpecialtySection from "@/modules/shop/components/create/ShopSpecialtySection";
import ShopAudioSection from "@/modules/shop/components/create/ShopAudioSection";
import FormSection from "@/modules/poi/components/create/FormSection";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShopEditDraft {
  name: string;
  description: string;
  /** Preview URL (existing remote URL or a new blob: URL). */
  avatarPreviewUrl: string | null;
  specialtyDescription: string;
  openingHours: OpeningHoursDto[];
  tags: string[];
  /** Existing remote audio URLs (or new blob: URLs for playback). */
  viAudioUrl: string | null;
  enAudioUrl: string | null;
  zhAudioUrl: string | null;
}

export interface ShopEditErrors {
  name?: string;
  description?: string;
  avatar?: string;
}

/** Initialise draft from existing shop data.
 *  Audio URLs are fetched separately via GET /api/audio/shop/{shopId}
 *  and handled by ShopAudioSection internally. */
export function initShopEditDraft(shop: ShopDetail): ShopEditDraft {
  return {
    name: shop.name,
    description: shop.description ?? "",
    avatarPreviewUrl: shop.avatarUrl,
    specialtyDescription: shop.featuredDish ?? "",
    openingHours: shop.openingHours ?? Array.from({ length: 7 }, (_, i) => ({
      day: i,
      open: "08:00",
      close: "22:00",
      closed: false,
    })),
    tags: shop.tags ?? [],
    viAudioUrl: null,
    enAudioUrl: null,
    zhAudioUrl: null,
  };
}

/** Client-side validation for the shop edit draft. */
export function validateShopEdit(draft: ShopEditDraft): ShopEditErrors {
  const errors: ShopEditErrors = {};
  if (!draft.name.trim()) {
    errors.name = "Tên gian hàng là bắt buộc.";
  } else if (draft.name.trim().length < 3 || draft.name.trim().length > 100) {
    errors.name = "Tên gian hàng phải từ 3 đến 100 ký tự.";
  }
  const plainDesc =
    typeof document !== "undefined"
      ? new DOMParser().parseFromString(draft.description, "text/html").body.innerText
      : draft.description.replace(/<[^>]*>/g, "");
  if (plainDesc.trim().length < 50) {
    errors.description = "Mô tả phải ít nhất 50 ký tự.";
  }
  if (!draft.avatarPreviewUrl) {
    errors.avatar = "Ảnh bìa gian hàng là bắt buộc.";
  }
  return errors;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  draft: ShopEditDraft;
  errors: ShopEditErrors;
  additionalSlots: ImageSlot[];
  onChange: (patch: Partial<ShopEditDraft>) => void;
  onAvatarFileChange: (file: File | null, previewUrl: string | null) => void;
  onAdditionalSlotsChange: (slots: ImageSlot[], files: File[]) => void;
  onAudioGenerated: (language: "vi" | "en" | "zh", blob: Blob, blobUrl: string) => void;
  onClearError: (field: keyof ShopEditErrors) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditShopSection({
  draft,
  errors,
  additionalSlots,
  onChange,
  onAvatarFileChange,
  onAdditionalSlotsChange,
  onAudioGenerated,
  onClearError,
}: Props) {
  return (
    <div className="space-y-5">
      {/* ── Gian hàng liên kết ──────────────────────────────────────────── */}
      <FormSection title="Gian hàng liên kết">
        <div className="space-y-5">
          <ShopImageUpload
            avatarPreviewUrl={draft.avatarPreviewUrl}
            additionalSlots={additionalSlots}
            errors={{ avatar: errors.avatar }}
            showAvatar
            onAvatarChange={(file, previewUrl) => {
              onAvatarFileChange(file, previewUrl);
              onChange({ avatarPreviewUrl: previewUrl });
              onClearError("avatar");
            }}
            onAdditionalChange={(slots) =>
              onAdditionalSlotsChange(slots, slots.flatMap((s) => s.file ? [s.file] : []))
            }
            maxAdditional={5}
          />
          <ShopBasicInfoSection
            name={draft.name}
            description={draft.description}
            showName
            errors={{ name: errors.name, description: errors.description }}
            maxDescChars={500}
            showRemaining
            onChange={(field, value) => {
              if (field === "name") {
                onChange({ name: value });
                onClearError("name");
              } else {
                onChange({ description: value });
                onClearError("description");
              }
            }}
          />
        </div>
      </FormSection>

      {/* ── Mô tả & Thông tin thêm ──────────────────────────────────────── */}
      <FormSection title="Mô tả & Thông tin thêm">
        <ShopSpecialtySection
          specialtyDescription={draft.specialtyDescription}
          openingHours={draft.openingHours}
          tags={draft.tags}
          errors={{}}
          onChange={(field, value) => {
            if (field === "specialtyDescription") onChange({ specialtyDescription: value as string });
            else if (field === "openingHours") onChange({ openingHours: value as OpeningHoursDto[] });
            else if (field === "tags") onChange({ tags: value as string[] });
          }}
        />
      </FormSection>

      {/* ── Âm thanh thuyết minh ─────────────────────────────────────────── */}
      <FormSection title="Âm thanh thuyết minh">
        <ShopAudioSection
          viAudioUrl={draft.viAudioUrl}
          enAudioUrl={draft.enAudioUrl}
          zhAudioUrl={draft.zhAudioUrl}
          onAudioGenerated={onAudioGenerated}
          maxTtsChars={2000}
        />
      </FormSection>
    </div>
  );
}

