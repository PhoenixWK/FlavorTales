"use client";

import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import ShopAudioSection from "@/modules/shop/components/create/ShopAudioSection";

export interface Step3Errors {
  audio?: string;
}

interface Props {
  draft: Pick<PoiCreateDraft, "viAudioUrl" | "enAudioUrl">;
  errors: Step3Errors;
  onAudioGenerated: (
    language: "vi" | "en",
    blob: Blob,
    blobUrl: string
  ) => void;
}

/**
 * Audio is optional — per FR: if TTS fails it should NOT block submission.
 * This validator always returns no errors; kept for API consistency.
 */
export function validateStep3(): Step3Errors {
  return {};
}

export default function AudioStep({ draft, errors, onAudioGenerated }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Thuyết minh âm thanh
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Tạo hoặc tải lên file audio giới thiệu gian hàng. Bước này không bắt
          buộc — bạn có thể bỏ qua và thêm sau.
        </p>
      </div>

      <ShopAudioSection
        viAudioUrl={draft.viAudioUrl}
        enAudioUrl={draft.enAudioUrl}
        error={errors.audio}
        maxTtsChars={2000}
        onAudioGenerated={onAudioGenerated}
      />
    </div>
  );
}
