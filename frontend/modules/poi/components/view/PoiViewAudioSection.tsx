"use client";

import { useState, useRef, useEffect } from "react";
import { proxyAudioUrl } from "@/shared/utils/mediaProxy";
import { getAudioByShop } from "@/modules/audio/services/audioApi";
import { toAudioByLanguage } from "@/modules/audio/types/audio";

type Lang = "vi" | "en" | "zh";

interface Props {
  /** shopId is used to fetch audio from GET /api/audio/shop/{shopId} */
  shopId: number;
}

const LANG_OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English (International)", flag: "🇬🇧" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function IconPlay() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function IconMusicNote() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-orange-300">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

/** Inline audio player card used by PoiViewAudioSection. */
function AudioPlayerCard({ src, lang }: { src: string; lang: Lang }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const proxied = proxyAudioUrl(src);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying((v) => !v);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || !duration) return;
    setProgress((audioRef.current.currentTime / duration) * 100);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;
    const pct = Number(e.target.value);
    audioRef.current.currentTime = (pct / 100) * duration;
    setProgress(pct);
  };

  const opt = LANG_OPTIONS.find((o) => o.code === lang);

  return (
    <div className="rounded-xl border border-orange-100 bg-linear-to-br from-orange-50 to-amber-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center shrink-0">
          <IconMusicNote />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            Audio Narration
          </p>
          <p className="text-xs text-gray-500">
            {opt?.flag} {opt?.label}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white border border-orange-100 rounded-lg px-3 py-2">
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shrink-0 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleSeek}
          className="flex-1 accent-orange-500 h-1.5 cursor-pointer"
        />
        <span className="text-xs text-gray-400 shrink-0 tabular-nums">
          {duration ? formatTime(duration) : "--:--"}
        </span>
      </div>

      <audio
        key={proxied}
        ref={audioRef}
        src={proxied ?? undefined}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}

/** Read-only audio section with language tab buttons. */
export default function PoiViewAudioSection({ shopId }: Props) {
  const [viAudioUrl, setViAudioUrl] = useState<string | null>(null);
  const [enAudioUrl, setEnAudioUrl] = useState<string | null>(null);
  const [zhAudioUrl, setZhAudioUrl] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<Lang | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAudioByShop(shopId)
      .then((list) => {
        const byLang = toAudioByLanguage(list);
        const vi = byLang.vi?.fileUrl ?? null;
        const en = byLang.en?.fileUrl ?? null;
        const zh = byLang.zh?.fileUrl ?? null;
        setViAudioUrl(vi);
        setEnAudioUrl(en);
        setZhAudioUrl(zh);
        // Auto-select the first language that has audio
        const first = LANG_OPTIONS.find(
          (o) =>
            (o.code === "en" && !!en) ||
            (o.code === "vi" && !!vi) ||
            (o.code === "zh" && !!zh)
        );
        if (first) setSelectedLang(first.code);
      })
      .catch(() => {
        // No audio available or network error — stay empty
      })
      .finally(() => setLoading(false));
  }, [shopId]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex gap-2">
          {LANG_OPTIONS.map((o) => (
            <div key={o.code} className="h-9 w-32 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-20 rounded-xl bg-gray-100" />
      </div>
    );
  }

  const available = LANG_OPTIONS.filter(
    (o) =>
      (o.code === "en" && !!enAudioUrl) ||
      (o.code === "vi" && !!viAudioUrl) ||
      (o.code === "zh" && !!zhAudioUrl)
  );

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <IconMusicNote />
        <p className="text-sm text-gray-400">No audio narration available</p>
      </div>
    );
  }

  const activeUrl =
    selectedLang === "en" ? enAudioUrl
    : selectedLang === "vi" ? viAudioUrl
    : selectedLang === "zh" ? zhAudioUrl
    : null;

  return (
    <div className="space-y-4">
      {/* Language tab buttons — custom HTML so emoji flags render correctly on all OS */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Language / Nation</p>
        <div className="flex gap-2 flex-wrap">
          {available.map((o) => {
            const isSelected = selectedLang === o.code;
            return (
              <button
                key={o.code}
                type="button"
                onClick={() => setSelectedLang(o.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition
                  ${isSelected
                    ? "bg-orange-500 border-orange-500 text-white font-medium shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600 cursor-pointer"
                  }`}
              >
                <span>{o.flag}</span>
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Player */}
      {selectedLang && activeUrl && (
        <AudioPlayerCard key={activeUrl} src={activeUrl} lang={selectedLang as Lang} />
      )}
    </div>
  );
}
