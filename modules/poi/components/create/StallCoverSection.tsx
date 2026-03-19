"use client";

import { useRef, useCallback } from "react";

export const STALL_TYPES = [
  "Nhà hàng",
  "Quán ăn",
  "Cà phê",
  "Tiệm bánh",
  "Đồ ăn nhanh",
  "Ăn chay",
  "Hải sản",
  "Xe đẩy",
  "Quán nhậu",
  "Buffet",
] as const;

export type StallType = (typeof STALL_TYPES)[number] | "";

interface Props {
  coverImageUrl: string | null;
  stallName: string;
  stallType: StallType;
  errors: { coverImage?: string; stallName?: string };
  onCoverImageChange: (file: File | null, previewUrl: string | null) => void;
  onStallNameChange: (value: string) => void;
  onStallTypeChange: (value: StallType) => void;
}

const MAX_SIZE_MB = 5;
const ACCEPTED = "image/svg+xml,image/png,image/jpeg,image/gif";

function IconImage() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-8 h-8 text-gray-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function StallCoverSection({
  coverImageUrl,
  stallName,
  stallType,
  errors,
  onCoverImageChange,
  onStallNameChange,
  onStallTypeChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) return;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) return;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      onCoverImageChange(file, url);
    },
    [onCoverImageChange]
  );

  const handleRemove = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    onCoverImageChange(null, null);
  };

  return (
    <div className="space-y-4">
      {/* Cover image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stall Cover Image
        </label>

        {coverImageUrl ? (
          <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white
                flex items-center justify-center hover:bg-black/80 transition text-sm leading-none"
              aria-label="Remove cover image"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center w-full h-44 rounded-xl
              border-2 border-dashed transition cursor-pointer
              ${
                errors.coverImage
                  ? "border-red-400 bg-red-50"
                  : "border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50"
              }`}
          >
            <IconImage />
            <p className="mt-2 text-sm text-gray-500">Click to upload cover image</p>
            <p className="text-xs text-gray-400 mt-0.5">
              SVG, PNG, JPG or GIF (max 900×400px)
            </p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {errors.coverImage && (
          <p className="text-xs text-red-500 mt-1">{errors.coverImage}</p>
        )}
      </div>

      {/* Stall Name + Type of Stall */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stall Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={stallName}
            maxLength={100}
            onChange={(e) => onStallNameChange(e.target.value)}
            placeholder="e.g. Tasty Bites"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white text-gray-900
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400
              focus:border-transparent
              ${errors.stallName ? "border-red-400" : "border-gray-200"}`}
          />
          {errors.stallName && (
            <p className="text-xs text-red-500 mt-1">{errors.stallName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type of Stall
          </label>
          <select
            value={stallType}
            onChange={(e) => onStallTypeChange(e.target.value as StallType)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white
              text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400
              focus:border-transparent"
          >
            <option value="">Select type</option>
            {STALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
