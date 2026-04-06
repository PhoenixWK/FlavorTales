"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { previewAllAudio, base64ToAudioBlob, type SupportedLanguage } from "@/modules/shop/services/audioApi";
import { useToast } from "@/shared/hooks/useToast";

type Language = SupportedLanguage;
type LangStatus = "idle" | "loading" | "done" | "error";

const ALL_LANGUAGES: Language[] = ["vi", "en", "zh", "ko", "ru", "ja"];

const LANGUAGES: Array<{ code: Language; flag: string; name: string }> = [
  { code: "vi", flag: "", name: "Tiếng Việt" },
  { code: "en", flag: "", name: "English" },
  { code: "zh", flag: "", name: "中文" },
  { code: "ko", flag: "", name: "한국어" },
  { code: "ru", flag: "", name: "Русский" },
  { code: "ja", flag: "", name: "日本語" },
];

const initialStatus = (): Record<Language, LangStatus> =>
  Object.fromEntries(ALL_LANGUAGES.map((l) => [l, "idle"])) as Record<Language, LangStatus>;
const initialErrors = (): Record<Language, string | null> =>
  Object.fromEntries(ALL_LANGUAGES.map((l) => [l, null])) as Record<Language, string | null>;

interface Props {
  audioUrls: Partial<Record<Language, string | null>>;
  /** Blob objects for already-generated audio — used to restore players after remount. */
  audioBlobs?: Partial<Record<Language, Blob>>;
  error?: string;
  onAudioGenerated: (language: Language, blob: Blob, blobUrl: string) => void;
  /** Max chars for TTS script. Defaults to 5000. */
  maxTtsChars?: number;
}

const MAX_TTS_CHARS = 5000;
const MIN_TTS_CHARS = 50;
const MAX_AUDIO_MB = 10;

//  Small pure UI helpers 

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

function SpinnerIcon() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-orange-300
      border-t-orange-600 rounded-full animate-spin shrink-0" />
  );
}

function resolveAudioSrc(rawUrl: string): string {
  if (rawUrl.startsWith("blob:")) return rawUrl;
  return `/api/audio/serve?url=${encodeURIComponent(rawUrl)}`;
}

function AudioPlayer({ src }: { src: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio
      key={src}
      controls
      src={resolveAudioSrc(src)}
      className="w-full rounded-lg"
      style={{ height: "36px" }}
    />
  );
}

function validateAudioFile(file: File): string | null {
  const byExt = /\.(mp3|m4a|wav)$/i.test(file.name);
  const byMime = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/aac"]
    .includes(file.type);
  if (!byExt && !byMime) return "Chỉ chấp nhận file MP3, M4A hoặc WAV.";
  if (file.size > MAX_AUDIO_MB * 1024 * 1024) return `File không được vượt quá ${MAX_AUDIO_MB} MB.`;
  return null;
}

//  Main component 

export default function ShopAudioSection({
  audioUrls,
  audioBlobs,
  error,
  onAudioGenerated,
  maxTtsChars,
}: Props) {
  const { addToast, updateToast } = useToast();
  const effectiveMax = maxTtsChars ?? MAX_TTS_CHARS;

  const [viText, setViText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [langStatus, setLangStatus] = useState<Record<Language, LangStatus>>(initialStatus);
  const [langErrors, setLangErrors] = useState<Record<Language, string | null>>(initialErrors);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Tracks the currently-valid (non-revoked) URL for each language for rendering.
  const [liveUrls, setLiveUrls] = useState<Partial<Record<Language, string>>>({});

  const blobUrls = useRef<Partial<Record<Language, string>>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLangRef = useRef<Language | null>(null);

  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      abortControllerRef.current?.abort();
      Object.values(urls).forEach((u) => { if (u) URL.revokeObjectURL(u); });
    };
  }, []);

  // On mount, recreate blob URLs from Blob objects so audio players work after back-navigation.
  useEffect(() => {
    if (!audioBlobs) return;
    const freshStatus: Partial<Record<Language, LangStatus>> = {};
    const freshUrls: Partial<Record<Language, string>> = {};
    for (const lang of ALL_LANGUAGES) {
      const blob = audioBlobs[lang];
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      blobUrls.current[lang] = url;
      freshUrls[lang] = url;
      freshStatus[lang] = "done";
    }
    if (Object.keys(freshUrls).length > 0) {
      setLiveUrls(freshUrls);
      setLangStatus((prev) => ({ ...prev, ...freshStatus } as Record<Language, LangStatus>));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  //  Generate all languages 

  const handleGenerateAll = async () => {
    const text = viText.trim();
    if (!text) {
      setLangErrors({ ...initialErrors(), vi: "Vui lòng nhập đoạn thuyết minh tiếng Việt." });
      return;
    }
    if (text.length < MIN_TTS_CHARS) {
      setLangErrors({ ...initialErrors(), vi: `Đoạn thuyết minh cần ít nhất ${MIN_TTS_CHARS} ký tự.` });
      return;
    }

    setLangErrors(initialErrors());
    setLangStatus(Object.fromEntries(ALL_LANGUAGES.map((l) => [l, "loading"])) as Record<Language, LangStatus>);
    setGenerating(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const toastId = addToast("loading", "Đang tạo audio cho tất cả ngôn ngữ");

    try {
      const result = await previewAllAudio(text, controller.signal);

      const newStatus = initialStatus();
      const newErrors = initialErrors();

      const newLiveUrls: Partial<Record<Language, string>> = {};
      for (const lang of ALL_LANGUAGES) {
        const b64 = result.audioBase64[lang];
        if (b64) {
          const blob = base64ToAudioBlob(b64);
          const old = blobUrls.current[lang];
          if (old) URL.revokeObjectURL(old);
          const blobUrl = URL.createObjectURL(blob);
          blobUrls.current[lang] = blobUrl;
          newLiveUrls[lang] = blobUrl;
          onAudioGenerated(lang, blob, blobUrl);
          newStatus[lang] = "done";
        }
      }
      setLiveUrls((prev) => ({ ...prev, ...newLiveUrls }));

      for (const { language, message } of result.errors) {
        newStatus[language] = "error";
        newErrors[language] = message;
      }

      setLangStatus(newStatus);
      setLangErrors(newErrors);

      const successCount = Object.values(newStatus).filter((s) => s === "done").length;
      const errorCount = result.errors.length;
      const total = ALL_LANGUAGES.length;

      if (errorCount === 0) {
        updateToast(toastId, { type: "success", message: `Tạo audio thành công cho tất cả ${total} ngôn ngữ!`, duration: 3000 });
      } else if (successCount > 0) {
        updateToast(toastId, {
          type: "error",
          message: `Tạo thành công ${successCount}/${total} ngôn ngữ. ${errorCount} ngôn ngữ gặp lỗi.`,
          duration: 6000,
        });
      } else {
        updateToast(toastId, { type: "error", message: "Không thể tạo audio cho bất kỳ ngôn ngữ nào.", duration: 6000 });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        updateToast(toastId, { type: "error", message: "Đã hủy tạo audio.", duration: 2000 });
        setLangStatus(initialStatus());
        return;
      }
      const msg = e instanceof Error ? e.message : "Tạo audio thất bại, vui lòng thử lại.";
      setLangStatus(Object.fromEntries(ALL_LANGUAGES.map((l) => [l, "error"])) as Record<Language, LangStatus>);
      setLangErrors({ ...initialErrors(), vi: msg });
      updateToast(toastId, { type: "error", message: msg, duration: 5000 });
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  //  File upload (manual override per language) 

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadLangRef.current) return;
    const err = validateAudioFile(file);
    if (err) { setUploadError(err); e.target.value = ""; return; }

    const lang = uploadLangRef.current;
    const old = blobUrls.current[lang];
    if (old) URL.revokeObjectURL(old);
    const blobUrl = URL.createObjectURL(file);
    blobUrls.current[lang] = blobUrl;
    onAudioGenerated(lang, file, blobUrl);
    setLiveUrls((prev) => ({ ...prev, [lang]: blobUrl }));

    setLangStatus((prev) => ({ ...prev, [lang]: "done" }));
    setLangErrors((prev) => ({ ...prev, [lang]: null }));
    setUploadError(null);
    e.target.value = "";
  };

  const triggerFileUpload = (lang: Language) => {
    uploadLangRef.current = lang;
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const hasAllAudio = ALL_LANGUAGES.every((l) => !!(liveUrls[l] ?? audioUrls[l]));

  //  Render 

  return (
    <section className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Dán đoạn thuyết minh tiếng Việt, hệ thống sẽ tự dịch và tạo audio cho tất cả ngôn ngữ
        (Tiếng Việt, English, 中文, 한국어, Русский, 日本語).
        Cần có ít nhất một ngôn ngữ trước khi gửi kiểm duyệt.
      </p>

      {/* Vietnamese text input */}
      <div>
        <textarea
          value={viText}
          maxLength={effectiveMax}
          rows={5}
          disabled={generating}
          onChange={(e) => {
            setViText(e.target.value);
            setLangErrors((prev) => ({ ...prev, vi: null }));
          }}
          placeholder="VD: Chào mừng bạn đến với gian hàng của chúng tôi. Chúng tôi chuyên cung cấp"
          className="w-full px-3 py-2.5 rounded-xl border text-sm text-gray-900 bg-white
            placeholder-gray-400 resize-none focus:outline-none focus:ring-2
            focus:ring-orange-400 focus:border-transparent border-gray-200
            disabled:bg-gray-50 disabled:text-gray-400"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">
            {viText.length}/{effectiveMax}
            {viText.length > 0 && viText.trim().length < MIN_TTS_CHARS && (
              <span className="ml-1 text-red-400">(tối thiểu {MIN_TTS_CHARS})</span>
            )}
          </span>
        </div>
        {langErrors.vi && (
          <p className="mt-1 text-xs text-red-500 bg-red-50 border border-red-200
            rounded-lg px-3 py-2">{langErrors.vi}</p>
        )}
      </div>

      {/* Generate All button */}
      <button
        type="button"
        onClick={handleGenerateAll}
        disabled={generating || !viText.trim()}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
          transition border
          ${generating || !viText.trim()
            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
          }`}
      >
        <IconMic />
        {generating ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/40
              border-t-white rounded-full animate-spin" />
            Đang tạo audio
          </span>
        ) : `Tạo audio ${ALL_LANGUAGES.length} ngôn ngữ`}
      </button>

      {/* Per-language status + players */}
      <div className="space-y-3">
        {LANGUAGES.map((lang) => {
          const status = langStatus[lang.code];
          const langError = langErrors[lang.code];
          const audioUrl = liveUrls[lang.code] ?? audioUrls[lang.code];

          return (
            <div key={lang.code}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden">

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-base">{lang.flag}</span>
                <span className="text-sm font-medium text-gray-700 flex-1">{lang.name}</span>
                <span className="text-xs text-gray-400 bg-white border border-gray-200
                  px-2 py-0.5 rounded-full">Google Cloud TTS</span>

                {status === "loading" && <SpinnerIcon />}
                {status === "done" && (
                  <span className="text-xs font-bold text-green-600 bg-green-50
                    border border-green-200 px-2 py-0.5 rounded-full"> Sẵn sàng</span>
                )}
                {status === "error" && (
                  <span className="text-xs font-bold text-red-600 bg-red-50
                    border border-red-200 px-2 py-0.5 rounded-full"> Lỗi</span>
                )}

                <button
                  type="button"
                  title="Tải lên file audio thay thế"
                  onClick={() => triggerFileUpload(lang.code)}
                  disabled={generating}
                  className="text-xs text-gray-500 hover:text-orange-600 border border-gray-200
                    hover:border-orange-300 rounded-lg px-2 py-1 transition
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Tải lên
                </button>
              </div>

              {status === "error" && langError && (
                <p className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
                  {langError}
                </p>
              )}

              {audioUrl && (
                <div className="px-3 py-2.5">
                  <AudioPlayer src={audioUrl} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {uploadError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200
          rounded-lg px-3 py-2">{uploadError}</p>
      )}

      {hasAllAudio && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl
          bg-green-50 border border-green-200">
          <span className="flex items-center justify-center w-6 h-6 rounded-full
            bg-green-500 text-white text-xs font-bold shrink-0"></span>
          <div>
            <p className="text-sm font-semibold text-green-800">
              Tất cả 6 ngôn ngữ đã sẵn sàng!
            </p>
            <p className="text-xs text-green-600">Nghe thử ở từng ngôn ngữ trước khi gửi kiểm duyệt</p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

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