"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearDraft,
  DEFAULT_DRAFT,
  loadDraft,
  saveDraft,
  ShopDraftState,
  OpeningHoursDto,
} from "@/modules/shop/types/shop";
import { createShop } from "@/modules/shop/services/shopApi";
import { uploadImages, stripHtml } from "@/modules/shop/services/uploadShopAssets";
import { uploadAudiosForShop } from "@/modules/audio/services/audioApi";
import { useToast } from "@/shared/hooks/useToast";

import ShopBasicInfoSection from "./ShopBasicInfoSection";
import ShopImageUpload from "./ShopImageUpload";
import type { ImageSlot } from "./ShopImageUpload";
import ShopSpecialtySection from "./ShopSpecialtySection";
import ShopAudioSection from "./ShopAudioSection";
import ShopPreviewPanel from "./ShopPreviewPanel";

// ── Form errors ───────────────────────────────────────────────────────────────
interface FormErrors {
  name?: string;
  description?: string;
  avatar?: string;
  additionalImages?: string;
  specialtyDescription?: string;
  tags?: string;
  audio?: string;
}

function validate(draft: ShopDraftState): FormErrors {
  const errors: FormErrors = {};
  if (!draft.name.trim()) {
    errors.name = "Tên gian hàng là bắt buộc.";
  } else if (draft.name.trim().length < 3) {
    errors.name = "Tên phải có ít nhất 3 ký tự.";
  } else if (draft.name.trim().length > 100) {
    errors.name = "Tên không được vượt quá 100 ký tự.";
  }

  const plainDesc = new DOMParser()
    .parseFromString(draft.description, "text/html")
    .body.innerText;
  if (!plainDesc.trim()) {
    errors.description = "Mô tả là bắt buộc.";
  } else if (plainDesc.trim().length < 50) {
    errors.description = `Mô tả cần ít nhất 50 ký tự (hiện có ${plainDesc.trim().length}).`;
  } else if (plainDesc.trim().length > 1000) {
    errors.description = "Mô tả không được vượt quá 1000 ký tự.";
  }

  if (!draft.avatarPreviewUrl) {
    errors.avatar = "Ảnh đại diện là bắt buộc.";
  }

  if (draft.tags.length > 5) {
    errors.tags = "Tối đa 5 tags.";
  }

  if (!draft.viAudioUrl && !draft.enAudioUrl && !draft.zhAudioUrl) {
    errors.audio = "Vui lòng tạo ít nhất một audio thuyết minh (Tiếng Việt, Tiếng Anh hoặc Tiếng Trung) trước khi gửi.";
  }

  return errors;
}

// ── Saved-at indicator ────────────────────────────────────────────────────────
function SavedAt({ time }: { time: Date | null }) {
  if (!time) return null;
  const hhmm = time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return (
    <span className="text-xs text-white/70">Đã lưu vào lúc {hhmm}</span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateShopForm() {
  const router = useRouter();
  const { addToast } = useToast();
  const [draft, setDraft] = useState<ShopDraftState>(DEFAULT_DRAFT);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Audio blobs — held in state (not draft; Blobs aren't JSON-serializable)
  const [audioBlobs, setAudioBlobs] = useState<{ vi?: Blob; en?: Blob; zh?: Blob }>({});

  // Image files — held in state (not draft; Files aren't JSON-serializable)
  // Upload to R2 only at form-submit time.
  const [imageFiles, setImageFiles] = useState<{
    avatar: File | null;
    additional: File[];
  }>({ avatar: null, additional: [] });

  // ── Load draft on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      setDraft(saved);
      setDraftRestored(true);
    }
  }, []);

  // ── Auto-save every 30 s (currently deactivated) ──────────────────────────
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    // Draft auto-save is deactivated
    // const interval = setInterval(() => {
    //   saveDraft(draftRef.current);
    //   setSavedAt(new Date());
    // }, 30_000);
    // return () => clearInterval(interval);
  }, []);

  // ── Draft updaters ─────────────────────────────────────────────────────────
  const update = useCallback(
    <K extends keyof ShopDraftState>(key: K, value: ShopDraftState[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const handleBasicChange = useCallback(
    (field: "name" | "description", value: string) => {
      update(field, value);
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

  const handleAvatarChange = useCallback(
    (file: File | null, previewUrl: string | null) => {
      setImageFiles((prev) => ({ ...prev, avatar: file }));
      update("avatarPreviewUrl", previewUrl);
      update("avatarFileId", null);
      setErrors((prev) => ({ ...prev, avatar: undefined }));
    },
    [update]
  );

  const handleAdditionalChange = useCallback(
    (slots: ImageSlot[]) => {
      setImageFiles((prev) => ({ ...prev, additional: slots.flatMap((s) => s.file ? [s.file] : []) }));
      update("additionalPreviewUrls", slots.map((s) => s.previewUrl));
      update("additionalImageIds", []);
    },
    [update]
  );

  const handleAudioGenerated = useCallback(
    (language: "vi" | "en" | "zh", blob: Blob, blobUrl: string) => {
      setAudioBlobs((prev) => ({ ...prev, [language]: blob }));
      if (language === "vi") update("viAudioUrl", blobUrl);
      else if (language === "en") update("enAudioUrl", blobUrl);
      else update("zhAudioUrl", blobUrl);
      setErrors((prev) => ({ ...prev, audio: undefined }));
    },
    [update]
  );

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationErrors = validate(draft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      addToast("error", "Vui lòng điền đầy đủ thông tin bắt buộc.", 5000);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload images (throws on failure)
      const { avatarFileId, additionalImageIds } = await uploadImages(imageFiles);

      // 2. Upload audio blobs after shop creation (non-blocking per language)
      if (!audioBlobs.vi && !audioBlobs.en && !audioBlobs.zh) {
        throw new Error("Vui lòng tạo ít nhất một audio thuyết minh trước khi gửi.");
      }

      // 3. Create the shop — strip HTML before sending so @Size counts plain text
      const res = await createShop({
        name: draft.name.trim(),
        description: stripHtml(draft.description),
        avatarFileId,
        additionalImageIds,
        specialtyDescription: draft.specialtyDescription,
        openingHours: draft.openingHours,
        tags: draft.tags,
      });

      if (!res.success) throw new Error(res.message);

      // Upload audio after shop is created (fire-and-forget, errors logged)
      uploadAudiosForShop(res.data.shopId, audioBlobs, (lang, err) => {
        console.error(`Audio upload failed for ${lang}:`, err);
      });

      clearDraft();
      addToast(
        "success",
        res.message ?? "Tạo gian hàng thành công, đang chờ duyệt.",
        5000
      );
      setTimeout(() => router.push("/vendor/shop"), 2000);
    } catch (e: unknown) {
      addToast(
        "error",
        e instanceof Error ? e.message : "Gửi thất bại, vui lòng thử lại.",
        5000
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived props for image section ────────────────────────────────────────
  const additionalSlots: ImageSlot[] = imageFiles.additional.map((file, i) => ({
    file,
    previewUrl: draft.additionalPreviewUrls[i] ?? "",
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  if (previewMode) {
    return (
      <ShopPreviewPanel
        draft={draft}
        onBack={() => setPreviewMode(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Gradient Hero Header ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-linear-to-br from-orange-500 via-orange-500 to-amber-400
        p-6 mb-6 shadow-lg shadow-orange-200/60">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">🏪</span>
              <h2 className="text-xl font-bold text-white">Tạo hồ sơ gian hàng</h2>
            </div>
            <p className="text-orange-100 text-sm">
              Điền đầy đủ thông tin để gửi kiểm duyệt
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* <SavedAt time={savedAt} /> */}
            <button
              type="button"
              disabled
              onClick={() => {
                saveDraft(draft);
                setSavedAt(new Date());
              }}
              className="px-3 py-1.5 text-xs rounded-lg text-white/40 border border-white/20
                bg-white/10 cursor-not-allowed transition"
            >
              Lưu nháp
            </button>
          </div>
        </div>
        {/* Step indicators */}
        <div className="flex gap-2 mt-4">
          {[
            { icon: "📝", label: "Thông tin" },
            { icon: "🖼️", label: "Hình ảnh" },
            { icon: "⭐", label: "Đặc trưng" },
            { icon: "🎙️", label: "Audio" },
          ].map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl
                px-3 py-1.5 text-xs text-white font-medium border border-white/20"
            >
              <span>{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Draft restored notice */}
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200
          rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-base">💾</span>
            <p className="text-xs text-amber-700 font-medium">
              Đã khôi phục bản nháp trước đó.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              setDraft(DEFAULT_DRAFT);
              setDraftRestored(false);
            }}
            className="text-xs text-amber-600 hover:text-amber-800 font-semibold hover:underline"
          >
            Xóa nháp
          </button>
        </div>
      )}

      {/* ── Form sections ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <ShopBasicInfoSection
            name={draft.name}
            description={draft.description}
            errors={{ name: errors.name, description: errors.description }}
            onChange={handleBasicChange}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <ShopImageUpload
            avatarPreviewUrl={draft.avatarPreviewUrl}
            additionalSlots={additionalSlots}
            errors={{ avatar: errors.avatar, additionalImages: errors.additionalImages }}
            onAvatarChange={handleAvatarChange}
            onAdditionalChange={handleAdditionalChange}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <ShopSpecialtySection
            specialtyDescription={draft.specialtyDescription}
            openingHours={draft.openingHours}
            tags={draft.tags}
            errors={{
              specialtyDescription: errors.specialtyDescription,
              tags: errors.tags,
            }}
            onChange={handleSpecialtyChange}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <ShopAudioSection
            viAudioUrl={draft.viAudioUrl}
            enAudioUrl={draft.enAudioUrl}
            zhAudioUrl={draft.zhAudioUrl}
            error={errors.audio}
            onAudioGenerated={handleAudioGenerated}
          />
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.push("/vendor/shop")}
          className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Huỷ
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200
              text-gray-700 hover:bg-gray-50 transition"
          >
            Xem trước
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm
              ${submitting
                ? "bg-orange-300 text-white cursor-wait"
                : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-orange-200"
              }`}
          >
            {submitting ? "Đang gửi…" : "🚀 Gửi kiểm duyệt"}
          </button>
        </div>
      </div>

    </div>
  );
}
