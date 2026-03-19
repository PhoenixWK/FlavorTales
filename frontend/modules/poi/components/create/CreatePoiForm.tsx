"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearDraft, DEFAULT_DRAFT, loadDraft, saveDraft, type PoiCreateDraft } from "@/modules/poi/types/poi";
import type { OpeningHoursDto } from "@/modules/shop/types/shop";
import { createPoi } from "@/modules/poi/services/poiApi";
import { uploadImages, uploadAudios, stripHtml } from "@/modules/shop/services/uploadShopAssets";
import { useToast } from "@/shared/hooks/useToast";
import type { ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import ShopImageUpload from "@/modules/shop/components/create/ShopImageUpload";
import ShopBasicInfoSection from "@/modules/shop/components/create/ShopBasicInfoSection";
import ShopAudioSection from "@/modules/shop/components/create/ShopAudioSection";
import ShopSpecialtySection from "@/modules/shop/components/create/ShopSpecialtySection";

import FormSection from "./FormSection";
import StallCoverSection, { type StallType } from "./StallCoverSection";
import PoiLocationStep, { validateStep1, type Step1Errors } from "./PoiLocationStep";
import { validateStep2, type Step2Errors } from "./ShopInfoStep";

// ── Combined form errors ───────────────────────────────────────────────────────

interface AllErrors extends Step1Errors, Step2Errors {}

function validateAll(draft: PoiCreateDraft): AllErrors {
  return { ...validateStep1(draft), ...validateStep2(draft) };
}

// ── Main form ──────────────────────────────────────────────────────────────────

export default function CreatePoiForm() {
  const router = useRouter();
  const { addToast } = useToast();
  const [draft, setDraft] = useState<PoiCreateDraft>(DEFAULT_DRAFT);
  const [errors, setErrors] = useState<AllErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Blobs + Files held outside draft (not JSON-serializable)
  const [audioBlobs, setAudioBlobs] = useState<{ vi?: Blob; en?: Blob }>({});
  const [imageFiles, setImageFiles] = useState<{ avatar: File | null; additional: File[] }>({
    avatar: null,
    additional: [],
  });
  const [additionalSlots, setAdditionalSlots] = useState<ImageSlot[]>([]);

  // ── Restore draft ────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadDraft();
    if (saved) setDraft(saved);
  }, []);

  // ── Auto-save draft (debounced) ──────────────────────────────────────────────
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    const t = setTimeout(() => saveDraft(draftRef.current), 1000);
    return () => clearTimeout(t);
  }, [draft]);

  // ── Draft updater ────────────────────────────────────────────────────────────
  const update = useCallback(<K extends keyof PoiCreateDraft>(key: K, value: PoiCreateDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Field handlers ───────────────────────────────────────────────────────────

  const handleStep1Change = useCallback(
    (field: keyof Pick<PoiCreateDraft, "poiName" | "lat" | "lng" | "radius">, value: string | number | null) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update(field as any, value as any);
    },
    [update]
  );

  const handleAvatarChange = useCallback(
    (file: File | null, previewUrl: string | null) => {
      setImageFiles((prev) => ({ ...prev, avatar: file }));
      update("avatarPreviewUrl", previewUrl);
      update("avatarFileId", null);
    },
    [update]
  );

  const handleAdditionalChange = useCallback(
    (slots: ImageSlot[]) => {
      setAdditionalSlots(slots);
      setImageFiles((prev) => ({ ...prev, additional: slots.map((s) => s.file) }));
      update("additionalPreviewUrls", slots.map((s) => s.previewUrl));
      update("additionalImageIds", []);
    },
    [update]
  );

  const handleSpecialtyChange = useCallback(
    (
      field: "specialtyDescription" | "openingHours" | "tags",
      value: string | OpeningHoursDto[] | string[]
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update(field as any, value as any);
    },
    [update]
  );

  const handleAudioGenerated = useCallback(
    (language: "vi" | "en", blob: Blob, blobUrl: string) => {
      setAudioBlobs((prev) => ({ ...prev, [language]: blob }));
      if (language === "vi") {
        update("viAudioUrl", blobUrl);
        update("viAudioFileId", null);
      } else {
        update("enAudioUrl", blobUrl);
        update("enAudioFileId", null);
      }
    },
    [update]
  );

  const clearError = useCallback(
    (field: keyof AllErrors) => setErrors((prev) => ({ ...prev, [field]: undefined })),
    []
  );

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationErrors = validateAll(draft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const { avatarFileId, additionalImageIds } = await uploadImages(imageFiles);

      const { viFileId, enFileId } = await uploadAudios(
        audioBlobs,
        (lang, msg) =>
          addToast("error", `Tải audio ${lang === "vi" ? "tiếng Việt" : "tiếng Anh"} thất bại: ${msg}`, 4000)
      );

      const plainDescription = stripHtml(draft.shopDescription);

      const res = await createPoi({
        name: draft.poiName.trim(),
        latitude: parseFloat(draft.lat!.toFixed(6)),
        longitude: parseFloat(draft.lng!.toFixed(6)),
        radius: draft.radius,
        shopName: draft.shopName.trim(),
        shopDescription: plainDescription,
        avatarFileId,
        additionalImageIds,
        specialtyDescription: draft.specialtyDescription || undefined,
        openingHours: draft.openingHours,
        tags: draft.tags,
        viAudioFileId: viFileId ?? undefined,
        enAudioFileId: enFileId ?? undefined,
      });

      if (!res.success) throw new Error(res.message);

      clearDraft();
      addToast("success", res.data?.message ?? "Tạo gian hàng thành công – đang chờ duyệt.", 6000);
      setTimeout(() => router.push("/vendor/poi"), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      addToast("error", msg, 6000);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Basic Information ─────────────────────────────────────────────── */}
      <FormSection title="Basic Information">
        <StallCoverSection
          coverImageUrl={draft.avatarPreviewUrl}
          stallName={draft.shopName}
          stallType={(draft.tags[0] ?? "") as StallType}
          errors={{ coverImage: errors.avatar, stallName: errors.shopName }}
          onCoverImageChange={(file, url) => {
            handleAvatarChange(file, url);
            clearError("avatar");
          }}
          onStallNameChange={(v) => {
            update("shopName", v);
            clearError("shopName");
          }}
          onStallTypeChange={(v) => update("tags", v ? [v] : [])}
        />
      </FormSection>

      {/* ── Description & Media ───────────────────────────────────────────── */}
      <FormSection title="Description & Media">
        <div className="space-y-5">
          <ShopBasicInfoSection
            name={draft.shopName}
            description={draft.shopDescription}
            showName={false}
            errors={{ description: errors.description }}
            maxDescChars={500}
            showRemaining
            onChange={(f, v) => {
              if (f === "description") {
                update("shopDescription", v);
                clearError("description");
              }
            }}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gallery Images{" "}
              <span className="text-gray-400 font-normal">(optional, up to 4)</span>
            </label>
            <ShopImageUpload
              avatarPreviewUrl={draft.avatarPreviewUrl}
              additionalSlots={additionalSlots}
              showAvatar={false}
              errors={{ additionalImages: errors.additionalImages }}
              onAvatarChange={handleAvatarChange}
              onAdditionalChange={handleAdditionalChange}
              maxAdditional={4}
            />
          </div>

          <ShopSpecialtySection
            specialtyDescription={draft.specialtyDescription}
            openingHours={draft.openingHours}
            tags={draft.tags}
            showTags={false}
            errors={{ specialtyDescription: errors.specialtyDescription }}
            onChange={handleSpecialtyChange}
          />
        </div>
      </FormSection>

      {/* ── Audio Narration ───────────────────────────────────────────────── */}
      <FormSection title="Audio Narration">
        <ShopAudioSection
          viAudioUrl={draft.viAudioUrl}
          enAudioUrl={draft.enAudioUrl}
          maxTtsChars={2000}
          onAudioGenerated={handleAudioGenerated}
        />
      </FormSection>

      {/* ── Location & Contact ────────────────────────────────────────────── */}
      <FormSection title="Location & Contact">
        <PoiLocationStep
          draft={draft}
          errors={{
            poiName: errors.poiName,
            location: errors.location,
            radius: errors.radius,
          }}
          onChange={(field, value) => {
            handleStep1Change(field, value);
            clearError(field as keyof AllErrors);
          }}
          onClearError={(field) => clearError(field as keyof AllErrors)}
          onBlurField={(field, error) =>
            setErrors((prev) => ({ ...prev, [field]: error }))
          }
        />
      </FormSection>

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <button
          type="button"
          onClick={() => router.push("/vendor/poi")}
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium
            text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white
            text-sm font-semibold disabled:opacity-60 transition"
        >
          {submitting ? "Submitting…" : "Add Stall"}
        </button>
      </div>
    </div>
  );
}
