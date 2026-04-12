"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePoiCreateDraft } from "@/modules/poi/hooks/usePoiCreateDraft";
import { usePoiTranslation } from "@/modules/poi/hooks/usePoiTranslation";
import FormSection from "./FormSection";
import StepIndicator from "./StepIndicator";
import PoiLocationStep from "./PoiLocationStep";
import ShopInfoStep from "./ShopInfoStep";
import PoiReviewStep from "./PoiReviewStep";
import PoiTranslationStep from "./PoiTranslationStep";

const STEPS = ["Vị trí POI", "Thông tin gian hàng", "Dịch thông tin", "Xem lại"];

export default function CreatePoiForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const {
    draft,
    errors,
    submitting,
    audioBlobs,
    additionalSlots,
    imageFiles,
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
  } = usePoiCreateDraft();

  const { runPreview, ...translationState } = usePoiTranslation();

  const handleNext = async () => {
    const stepErrors = validateCurrentStep(currentStep as 1 | 2);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    setCurrentStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s));
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <div className="space-y-5">
        {/* ── Step 1: Vị trí POI ──────────────────────────────────────────── */}
        {currentStep === 1 && (
          <FormSection title="Vị trí POI">
            <PoiLocationStep
              draft={draft}
              errors={{
                poiName: errors.poiName,
                location: errors.location,
                radius: errors.radius,
              }}
              onChange={(field, value) => {
                handleStep1Change(field, value);
                if (field === "lat" || field === "lng") clearError("location");
                else if (field === "address") { /* no Step1Error for address */ }
                else clearError(field as "poiName" | "radius");
              }}
              onClearError={clearError}
              onBlurField={(field, error) =>
                setErrors((prev) => ({ ...prev, [field]: error }))
              }
            />
          </FormSection>
        )}

        {/* ── Step 2: Thông tin gian hàng ─────────────────────────────────── */}
        {currentStep === 2 && (
          <FormSection title="Thông tin gian hàng">
            <ShopInfoStep
              draft={draft}
              errors={{
                shopName: errors.shopName,
                description: errors.description,
                avatar: errors.avatar,
                additionalImages: errors.additionalImages,
                specialtyDescription: errors.specialtyDescription,
                tags: errors.tags,
              }}
              additionalSlots={additionalSlots}
              audioBlobs={audioBlobs}
              onBasicChange={(field, value) => {
                if (field === "shopName") {
                  update("shopName", value);
                  clearError("shopName");
                } else {
                  update("shopDescription", value);
                  clearError("description");
                }
              }}
              onAvatarChange={handleAvatarChange}
              onAdditionalChange={handleAdditionalChange}
              onSpecialtyChange={handleSpecialtyChange}
              onAudioGenerated={handleAudioGenerated}
              onClearError={clearError}
              onBlurField={(field, error) =>
                setErrors((prev) => ({ ...prev, [field]: error }))
              }
            />
          </FormSection>
        )}

        {/* ── Step 3: Dịch thông tin ──────────────────────────────────────── */}
        {currentStep === 3 && (
          <PoiTranslationStep draft={draft} translationState={translationState} runPreview={runPreview} />
        )}

        {/* ── Step 4: Xem lại ─────────────────────────────────────────────── */}
        {currentStep === 4 && (
          <PoiReviewStep
            draft={draft}
            imageFiles={imageFiles}
            audioBlobs={audioBlobs}
            onEdit={(step) => setCurrentStep(step as 1 | 2 | 3 | 4)}
            poiTranslations={translationState.poiResults}
            shopTranslations={translationState.shopResults}
          />
        )}
      </div>

      {/* ── Navigation buttons ──────────────────────────────────────────────── */}
      <div className="flex justify-between gap-3 pt-6 pb-8">
        {currentStep < 4 && (
          <button
            type="button"
            onClick={currentStep === 1 ? () => router.push("/vendor/poi") : handleBack}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium
              text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {currentStep === 1 ? "Huỷ" : "Quay lại"}
          </button>
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="ml-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white
              text-sm font-semibold disabled:opacity-60 transition"
          >
            {submitting ? "Đang xử lý…" : "Tiếp theo"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white
              text-sm font-semibold disabled:opacity-60 transition"
          >
            {submitting ? "Đang xử lý…" : "Hoàn tất"}
          </button>
        )}
      </div>
    </div>
  );
}
