"use client";

import { useEffect, useRef } from "react";
import type { SupportedLanguage } from "@/modules/audio/services/audioApi";

export const LANG_LABELS: Record<SupportedLanguage, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
  ko: "한국어",
  ru: "Русский",
  ja: "日本語",
};

export const LANG_ORDER: SupportedLanguage[] = ["vi", "en", "zh", "ko", "ru", "ja"];

interface Props {
  audioBlobs: Partial<Record<SupportedLanguage, Blob>>;
  selectedLang: SupportedLanguage;
  onLangChange: (lang: SupportedLanguage) => void;
}

export default function ReviewAudioSection({ audioBlobs, selectedLang, onLangChange }: Props) {
  const availableLangs = LANG_ORDER.filter((l) => !!audioBlobs[l]);
  const blobUrls = useRef<Partial<Record<SupportedLanguage, string>>>({});

  // Create fresh blob URLs from Blob objects on mount; revoke on unmount.
  useEffect(() => {
    const urls: Partial<Record<SupportedLanguage, string>> = {};
    for (const lang of LANG_ORDER) {
      const blob = audioBlobs[lang];
      if (blob) urls[lang] = URL.createObjectURL(blob);
    }
    blobUrls.current = urls;
    return () => {
      Object.values(urls).forEach((u) => { if (u) URL.revokeObjectURL(u); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (availableLangs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">Chưa có audio narration</p>
      </div>
    );
  }

  const activeSrc = blobUrls.current[selectedLang];

  return (
    <div className="space-y-3">
      {activeSrc ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          key={activeSrc}
          controls
          src={activeSrc}
          className="w-full rounded-lg"
          style={{ height: "36px" }}
        />
      ) : (
        <p className="text-sm text-gray-400 italic">
          Ngôn ngữ này chưa có audio.
        </p>
      )}
      <p className="text-xs text-gray-400">
        {availableLangs.length} / {LANG_ORDER.length} ngôn ngữ đã tạo
      </p>
    </div>
  );
}
