"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearDraft,
  DEFAULT_DRAFT,
  loadDraft,
  saveDraft,
  type PoiCreateDraft,
} from "@/modules/poi/types/poi";
import type { OpeningHoursDto } from "@/modules/shop/types/shop";
import { createPoi } from "@/modules/poi/services/poiApi";
import { uploadImages, stripHtml } from "@/modules/shop/services/uploadShopAssets";
import { uploadAudiosForShop } from "@/modules/audio/services/audioApi";
import type { SupportedLanguage } from "@/modules/audio/services/audioApi";
import { useToast } from "@/shared/hooks/useToast";
import { usePoiTranslation } from "@/modules/poi/hooks/usePoiTranslation";
import type { ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import { validateStep1, type Step1Errors } from "@/modules/poi/components/create/PoiLocationStep";
import { validateStep2, type Step2Errors } from "@/modules/poi/components/create/ShopInfoStep";

export interface AllErrors extends Step1Errors, Step2Errors {}

export interface PoiCreateDraftHook {
  draft: PoiCreateDraft;
  errors: AllErrors;
  submitting: boolean;
  audioBlobs: Partial<Record<SupportedLanguage, Blob>>;
  imageFiles: { avatar: File | null; additional: File[] };
  additionalSlots: ImageSlot[];

  update: <K extends keyof PoiCreateDraft>(key: K, value: PoiCreateDraft[K]) => void;
  handleStep1Change: (
    field: keyof Pick<PoiCreateDraft, "poiName" | "lat" | "lng" | "radius" | "address">,
    value: string | number | null
  ) => void;
  handleAvatarChange: (file: File | null, previewUrl: string | null) => void;
  handleAdditionalChange: (slots: ImageSlot[]) => void;
  handleSpecialtyChange: (
    field: "specialtyDescription" | "openingHours" | "tags",
    value: string | OpeningHoursDto[] | string[]
  ) => void;
  handleAudioGenerated: (language: SupportedLanguage, blob: Blob, blobUrl: string) => void;
  clearError: (field: keyof AllErrors) => void;
  setErrors: React.Dispatch<React.SetStateAction<AllErrors>>;
  validateCurrentStep: (step: number) => AllErrors;
  handleSubmit: () => Promise<void>;
}

export function usePoiCreateDraft(): PoiCreateDraftHook {
  const router = useRouter();
  const { addToast } = useToast();
  const { runTranslation } = usePoiTranslation();

  const [draft, setDraft] = useState<PoiCreateDraft>(DEFAULT_DRAFT);
  const [errors, setErrors] = useState<AllErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [audioBlobs, setAudioBlobs] = useState<Partial<Record<SupportedLanguage, Blob>>>({});
  const [imageFiles, setImageFiles] = useState<{ avatar: File | null; additional: File[] }>({
    avatar: null,
    additional: [],
  });
  const [additionalSlots, setAdditionalSlots] = useState<ImageSlot[]>([]);

  // Restore draft on mount — merge with DEFAULT_DRAFT so any field missing
  // from an older saved schema stays as a valid default, preventing
  // React "controlled → uncontrolled" input warnings.
  useEffect(() => {
    const saved = loadDraft();
    if (saved) setDraft({ ...DEFAULT_DRAFT, ...saved });
  }, []);

  // Auto-save draft (debounced 1s)
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    const t = setTimeout(() => saveDraft(draftRef.current), 1000);
    return () => clearTimeout(t);
  }, [draft]);

  const update = useCallback(<K extends keyof PoiCreateDraft>(key: K, value: PoiCreateDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleStep1Change = useCallback(
    (
      field: keyof Pick<PoiCreateDraft, "poiName" | "lat" | "lng" | "radius" | "address">,
      value: string | number | null
    ) => {
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
      setImageFiles((prev) => ({
        ...prev,
        additional: slots.flatMap((s) => (s.file ? [s.file] : [])),
      }));
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
    (language: SupportedLanguage, blob: Blob, blobUrl: string) => {
      setAudioBlobs((prev) => ({ ...prev, [language]: blob }));
      const key = `${language}AudioUrl` as keyof PoiCreateDraft;
      update(key, blobUrl);
    },
    [update]
  );

  const clearError = useCallback(
    (field: keyof AllErrors) => setErrors((prev) => ({ ...prev, [field]: undefined })),
    []
  );

  const validateCurrentStep = useCallback(
    (step: number): AllErrors => {
      if (step === 1) return validateStep1(draft);
      if (step === 2) return validateStep2(draft);
      return {};
    },
    [draft]
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const { avatarFileId, additionalImageIds } = await uploadImages(imageFiles);
      const plainDescription = stripHtml(draft.shopDescription);

      const res = await createPoi({
        name: draft.poiName.trim(),
        latitude: parseFloat(draft.lat!.toFixed(6)),
        longitude: parseFloat(draft.lng!.toFixed(6)),
        radius: draft.radius,
        address: draft.address.trim() || undefined,
        shopName: draft.shopName.trim(),
        shopDescription: plainDescription,
        avatarFileId,
        additionalImageIds,
        specialtyDescription: draft.specialtyDescription || undefined,
        openingHours: draft.openingHours,
        tags: draft.tags,
      });

      if (!res.success) throw new Error(res.message);

      const shopId = res.data?.linkedShopId;
      if (shopId && Object.keys(audioBlobs).length > 0) {
        await uploadAudiosForShop(shopId, audioBlobs, (lang, msg) =>
          addToast(
            "error",
            `Tải audio ${lang === "vi" ? "tiếng Việt" : lang === "zh" ? "tiếng Trung" : "tiếng Anh"} thất bại: ${msg}`,
            4000
          )
        );
      }

      const poiId = res.data?.poiId;
      if (!poiId || !shopId) throw new Error("Created POI/shop ID missing in response");

      // Fire-and-forget translation after POI is created
      runTranslation(poiId, shopId);

      clearDraft();
      addToast("success", "POI đã được tạo thành công – đang chờ duyệt.", 6000);
      setTimeout(() => router.push("/vendor/poi"), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      addToast("error", msg, 6000);
    } finally {
      setSubmitting(false);
    }
  }, [draft, imageFiles, audioBlobs, addToast, router, runTranslation]);

  return {
    draft,
    errors,
    submitting,
    audioBlobs,
    imageFiles,
    additionalSlots,
    update,
    handleStep1Change,
    handleAvatarChange,
    handleAdditionalChange,
    handleSpecialtyChange,
    handleAudioGenerated,
    clearError,
    setErrors,
    validateCurrentStep,
    handleSubmit,
  };
}
