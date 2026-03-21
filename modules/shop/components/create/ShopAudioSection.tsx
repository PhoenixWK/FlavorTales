"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { previewAudio } from "@/modules/shop/services/audioApi";
import { useToast } from "@/shared/hooks/useToast";

type Language = "vi" | "en" | "zh";

const LANGUAGES = [
  { code: "vi" as Language, flag: "🇻🇳", name: "Tiếng Việt", engine: "FPT AI Voice" },
  { code: "en" as Language, flag: "🇬🇧", name: "English", engine: "Google Cloud TTS" },
  { code: "zh" as Language, flag: "🇨🇳", name: "中文", engine: "Google Cloud TTS" },
];

interface Props {
  viAudioUrl: string | null;
  enAudioUrl: string | null;
  zhAudioUrl: string | null;
  error?: string;
  onAudioGenerated: (language: Language, blob: Blob, blobUrl: string) => void;
  /** Max chars for TTS script. Defaults to 5000. */
  maxTtsChars?: number;
}

const MAX_TTS_CHARS = 5000;
const MIN_TTS_CHARS = 50;
const MAX_AUDIO_MB = 10;

function IconMic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
      stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 10a7 7 0 01-14 0M12 19v4M8 23h8" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
      stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round"
        d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}

/**
 * Returns a URL suitable for <audio src>.
 * Local blob: URLs are used directly; R2/external URLs go through
 * the server-side proxy to avoid CORS and mixed-content errors.
 */
function resolveAudioSrc(rawUrl: string): string {
  if (rawUrl.startsWith("blob:")) return rawUrl;
  return `/api/audio/serve?url=${encodeURIComponent(rawUrl)}`;
}

function AudioPlayer({ label, src }: { label: string; src: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        key={src}
        controls
        src={resolveAudioSrc(src)}
        className="w-full rounded-lg"
        style={{ height: "36px" }}
      />
    </div>
  );
}

export default function ShopAudioSection({
  viAudioUrl,
  enAudioUrl,
  zhAudioUrl,
  error,
  onAudioGenerated,
  maxTtsChars,
}: Props) {
  const { addToast, updateToast } = useToast();
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [texts, setTexts] = useState<Record<Language, string>>({ vi: "", en: "", zh: "" });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const effectiveMax = maxTtsChars ?? MAX_TTS_CHARS;

  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLangRef = useRef<Language | null>(null);

  // Track active blob URLs so we can revoke them when the user regenerates
  const blobUrls = useRef<Partial<Record<Language, string>>>({});
  // AbortController for the current in-flight TTS request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Revoke blob URLs and abort any in-flight TTS request when unmounting
  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      abortControllerRef.current?.abort();
      Object.values(urls).forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, []);

  const handleSelectLang = (code: Language) => {
    setSelectedLang(code);
    setGenError(null);
  };

  const validateAudioFile = (file: File): string | null => {
    const byExt = /\.(mp3|m4a|wav)$/i.test(file.name);
    const byMime = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/aac"].includes(file.type);
    if (!byExt && !byMime) return "Chỉ chấp nhận file MP3, M4A hoặc WAV.";
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) return `File không được vượt quá ${MAX_AUDIO_MB} MB.`;
    return null;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadLangRef.current) return;
    const err = validateAudioFile(file);
    if (err) {
      setGenError(err);
      e.target.value = "";
      return;
    }
    const lang = uploadLangRef.current;
    const old = blobUrls.current[lang];
    if (old) URL.revokeObjectURL(old);
    const blobUrl = URL.createObjectURL(file);
    blobUrls.current[lang] = blobUrl;
    onAudioGenerated(lang, file, blobUrl);
    setGenError(null);
    e.target.value = "";
  };

  const triggerFileUpload = (lang: Language) => {
    uploadLangRef.current = lang;
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!selectedLang) return;
    const text = texts[selectedLang];
    if (!text.trim()) {
      setGenError("Vui lòng nhập đoạn thuyết minh trước khi tạo audio.");
      return;
    }
    if (text.trim().length < MIN_TTS_CHARS) {
      setGenError(`Đoạn thuyết minh cần ít nhất ${MIN_TTS_CHARS} ký tự.`);
      return;
    }
    setGenError(null);
    setGenerating(true);
    // Cancel any previous in-flight request before starting a new one
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const toastId = addToast("loading", "Đang tạo audio…");
    try {
      const blob = await previewAudio(text, selectedLang, controller.signal);

      // Revoke the previous blob URL for this language (if any) to free memory
      const old = blobUrls.current[selectedLang];
      if (old) URL.revokeObjectURL(old);

      const newBlobUrl = URL.createObjectURL(blob);
      blobUrls.current[selectedLang] = newBlobUrl;

      onAudioGenerated(selectedLang, blob, newBlobUrl);

      updateToast(toastId, { type: "success", message: "Tạo audio thành công!", duration: 3000 });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        // User navigated away or triggered a new generation — silently dismiss
        updateToast(toastId, { type: "error", message: "Đã hủy tạo audio.", duration: 2000 });
        return;
      }
      const msg =
        e instanceof Error ? e.message : "Tạo audio thất bại, vui lòng thử lại.";
      setGenError(msg);
      updateToast(toastId, { type: "error", message: msg, duration: 5000 });
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const selectedInfo = selectedLang ? LANGUAGES.find((l) => l.code === selectedLang) : null;
  const currentAudioUrl =
    selectedLang === "vi" ? viAudioUrl
    : selectedLang === "en" ? enAudioUrl
    : selectedLang === "zh" ? zhAudioUrl
    : null;
  const hasAllAudio = viAudioUrl && enAudioUrl && zhAudioUrl;

  return (
    <section className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Chọn ngôn ngữ, dán đoạn thuyết minh và tạo audio. Cần tạo ít nhất một ngôn ngữ.
      </p>

      {/* ── Language selector tabs ──────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {LANGUAGES.map((lang) => {
          const done =
            lang.code === "vi" ? !!viAudioUrl
            : lang.code === "en" ? !!enAudioUrl
            : !!zhAudioUrl;
          const isSelected = selectedLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectLang(lang.code)}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2
                rounded-xl border transition-all
                ${
                  isSelected
                    ? "bg-orange-50 text-orange-700 border-orange-400 ring-2 ring-orange-100"
                    : done
                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
            >
              <IconGlobe />
              <span>{lang.flag}&nbsp;{lang.name}</span>
              {done && (
                <span className={`text-xs font-bold ${
                  isSelected ? "text-orange-500" : "text-green-500"
                }`}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Text area + generate (shown after language selected) ────────────── */}
      {selectedLang && selectedInfo && (
        <div className="space-y-3">
          {/* Language header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{selectedInfo.flag}</span>
            <p className="text-sm font-medium text-gray-700">{selectedInfo.name}</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {selectedInfo.engine}
            </span>
            {currentAudioUrl && (
              <span className="ml-auto text-xs text-green-600 bg-green-50 border
                border-green-200 px-2 py-0.5 rounded-full font-medium">
                ✓ Đã có audio
              </span>
            )}
          </div>

          {/* Text input */}
          <div>
            <textarea
              value={texts[selectedLang]}
              maxLength={effectiveMax}
              rows={5}
              onChange={(e) => {
                const v = e.target.value;
                setTexts((prev) => ({ ...prev, [selectedLang]: v }));
                setGenError(null);
              }}
              placeholder={
                selectedLang === "vi"
                  ? "VD: Chào mừng bạn đến với gian hàng của chúng tôi…"
                  : selectedLang === "zh"
                  ? "例如：欢迎来到我们的店铺，我们专注于正宗美食…"
                  : "E.g. Welcome to our shop. We specialize in authentic cuisine…"
              }
              className="w-full px-3 py-2.5 rounded-xl border text-sm text-gray-900 bg-white
                placeholder-gray-400 resize-none focus:outline-none focus:ring-2
                focus:ring-orange-400 focus:border-transparent border-gray-200"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">
                {texts[selectedLang].length}/{effectiveMax}
                {texts[selectedLang].length < MIN_TTS_CHARS && (
                  <span className="ml-1 text-red-400">(tối thiểu {MIN_TTS_CHARS})</span>
                )}
              </span>
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !texts[selectedLang].trim()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              transition border
              ${generating || !texts[selectedLang].trim()
                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
              }`}
          >
            <IconMic />
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40
                  border-t-white rounded-full animate-spin" />
                Đang tạo audio…
              </span>
            ) : currentAudioUrl
              ? `Tạo lại (${selectedInfo.name})`
              : `Tạo audio (${selectedInfo.name})`}
          </button>

          {genError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200
              rounded-lg px-3 py-2">
              {genError}
            </p>
          )}

          {/* ── Alternative: upload existing audio file ─────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => triggerFileUpload(selectedLang)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5
              rounded-xl text-sm font-medium text-gray-600 border border-gray-200
              bg-white hover:bg-gray-50 hover:border-gray-300 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
              stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415
                6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Tải lên file có sẵn (MP3/M4A/WAV, ≤ 10 MB)
          </button>

          {/* Preview for the selected language */}
          {currentAudioUrl && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <AudioPlayer
                label={`${selectedInfo.flag} ${selectedInfo.name}`}
                src={currentAudioUrl}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Combined preview when both languages are ready ───────────────────── */}
      {hasAllAudio && (
        <div className="rounded-2xl border border-green-200 bg-green-50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-green-100/70
            border-b border-green-200">
            <span className="flex items-center justify-center w-6 h-6 rounded-full
              bg-green-500 text-white text-xs font-bold">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Cả hai ngôn ngữ đã sẵn sàng!
              </p>
              <p className="text-xs text-green-600">Nghe thử trước khi gửi kiểm duyệt</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <AudioPlayer label="🇻🇳 Tiếng Việt – FPT AI Voice" src={viAudioUrl!} />
            <div className="border-t border-green-200/60" />
            <AudioPlayer label="🇬🇧 English – Google Cloud TTS" src={enAudioUrl!} />
            <div className="border-t border-green-200/60" />
            <AudioPlayer label="🇨🇳 中文 – Google Cloud TTS" src={zhAudioUrl!} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Hidden file input for audio upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav"
        className="hidden"
        onChange={handleFileSelect}
      />
    </section>
  );
}
