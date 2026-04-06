"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveImgSrc } from "@/shared/utils/mediaProxy";

export interface ImageSlot {
  /** undefined for existing remote images (no local File object). */
  file?: File;
  previewUrl: string;
}

interface Props {
  avatarPreviewUrl: string | null;
  additionalSlots: ImageSlot[];
  errors: { avatar?: string; additionalImages?: string };
  /** file is null when the avatar is cleared */
  onAvatarChange: (file: File | null, previewUrl: string | null) => void;
  onAdditionalChange: (slots: ImageSlot[]) => void;
  /** Cap on additional images (default 5). Set to 4 to keep total ≤ 5. */
  maxAdditional?: number;
  /** Hide the avatar upload — use when avatar is rendered in a separate section. Defaults to true. */
  showAvatar?: boolean;
}

const MAX_SIZE_MB = 5;
const MAX_ADDITIONAL = 5;

function IconUpload() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-8 h-8 text-gray-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── Crop-preview helper: shows image fitted into a square viewport ───────────
function SquarePreview({
  src,
  alt,
  onRemove,
  size = "w-36 h-36",
}: {
  src: string;
  alt: string;
  onRemove?: () => void;
  size?: string;
}) {
  return (
    <div className={`relative ${size} rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveImgSrc(src) ?? src}
        alt={alt}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className="w-full h-full object-cover"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
          title="Xóa ảnh"
        >
          <IconX />
        </button>
      )}
    </div>
  );
}

export default function ShopImageUpload({
  avatarPreviewUrl,
  additionalSlots,
  errors,
  onAvatarChange,
  onAdditionalChange,
  maxAdditional,
  showAvatar = true,
}: Props) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const effectiveMax = maxAdditional ?? MAX_ADDITIONAL;

  // Track every blob URL we create so we can revoke them on unmount or replacement.
  const blobUrlsRef = useRef<Set<string>>(new Set());
  // Separate ref for the active avatar blob URL so we can revoke it on replace.
  const currentAvatarBlobRef = useRef<string | null>(null);

  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  // On mount, recreate blob URLs for any slots whose File objects are still available.
  // This restores previews after the component remounts (e.g. navigating back from a later step).
  useEffect(() => {
    const staleSlots = additionalSlots.filter((s) => s.file);
    if (staleSlots.length === 0) return;
    const refreshed = additionalSlots.map((s) => {
      if (!s.file) return s;
      const freshUrl = URL.createObjectURL(s.file);
      blobUrlsRef.current.add(freshUrl);
      return { ...s, previewUrl: freshUrl };
    });
    onAdditionalChange(refreshed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createBlobUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.add(url);
    return url;
  };

  const revokeBlobUrl = (url: string) => {
    URL.revokeObjectURL(url);
    blobUrlsRef.current.delete(url);
  };

  const validateFile = (file: File): string | null => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return "Chỉ chấp nhận file JPEG hoặc PNG.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File vượt giới hạn ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleAvatarFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) { setUploadError(err); return; }
      setUploadError(null);
      // Revoke previous avatar blob URL to free memory
      if (currentAvatarBlobRef.current) revokeBlobUrl(currentAvatarBlobRef.current);
      const blobUrl = createBlobUrl(file);
      currentAvatarBlobRef.current = blobUrl;
      onAvatarChange(file, blobUrl);
    },
    [onAvatarChange] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleAdditionalFiles = useCallback(
    (files: FileList) => {
      const remaining = effectiveMax - additionalSlots.length;
      const toProcess = Array.from(files).slice(0, remaining);
      if (toProcess.length === 0) return;

      setUploadError(null);
      const newSlots: ImageSlot[] = [];
      for (const file of toProcess) {
        const err = validateFile(file);
        if (err) { setUploadError(err); continue; }
        const blobUrl = createBlobUrl(file);
        newSlots.push({ file, previewUrl: blobUrl });
      }
      if (newSlots.length > 0) onAdditionalChange([...additionalSlots, ...newSlots]);
    },
    [additionalSlots, onAdditionalChange] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const removeAdditional = (index: number) => {
    // Revoke the blob URL for the removed slot
    revokeBlobUrl(additionalSlots[index].previewUrl);
    onAdditionalChange(additionalSlots.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-5">
      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      {showAvatar && <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ảnh đại diện <span className="text-red-500">*</span>
        </label>

        {avatarPreviewUrl ? (
          <div className="flex items-start gap-4">
            <SquarePreview
              src={avatarPreviewUrl}
              alt="Avatar preview"
              onRemove={() => {
                if (currentAvatarBlobRef.current) {
                  revokeBlobUrl(currentAvatarBlobRef.current);
                  currentAvatarBlobRef.current = null;
                }
                onAvatarChange(null, null);
              }}
              size="w-36 h-36"
            />
            <div className="text-xs text-gray-400 space-y-1 pt-1">
              <p>✓ Đã chọn</p>
              <p>Khuyến nghị: 800×600 px</p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="text-orange-500 hover:underline"
              >
                Thay ảnh khác
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className={`flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed
              transition cursor-pointer
              ${errors.avatar ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50"}`}
          >
            <IconUpload />
            <p className="mt-2 text-sm text-gray-500">Nhấn để chọn ảnh</p>
            <p className="text-xs text-gray-400 mt-0.5">JPEG/PNG, tối đa 5 MB</p>
          </button>
        )}

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleAvatarFile(f);
            e.target.value = "";
          }}
        />
        {errors.avatar && (
          <p className="text-xs text-red-500 mt-1">{errors.avatar}</p>
        )}
      </div>}

      {/* ── Additional images ────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ảnh bổ sung{" "}
          <span className="text-gray-400 font-normal">
            (tuỳ chọn, tối đa {effectiveMax} ảnh)
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          {additionalSlots.map((slot, idx) => (
            <SquarePreview
              key={slot.previewUrl}
              src={slot.previewUrl}
              alt={`Ảnh ${idx + 1}`}
              onRemove={slot.file ? () => removeAdditional(idx) : undefined}
              size="w-24 h-24"
            />
          ))}

          {additionalSlots.length < effectiveMax && (
            <button
              type="button"
              onClick={() => additionalInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200
                bg-gray-50 hover:border-orange-300 hover:bg-orange-50 flex flex-col
                items-center justify-center transition cursor-pointer"
            >
              <span className="text-2xl text-gray-300 leading-none">+</span>
              <span className="text-xs text-gray-400 mt-1">Thêm ảnh</span>
            </button>
          )}
        </div>

        <input
          ref={additionalInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleAdditionalFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {errors.additionalImages && (
          <p className="text-xs text-red-500 mt-1">{errors.additionalImages}</p>
        )}
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      )}
    </section>
  );
}
