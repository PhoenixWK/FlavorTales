"use client";

import { useState, useRef } from "react";

interface StallDetailAudioNarrationProps {
  viAudioUrl: string | null;
  enAudioUrl: string | null;
}

/** Route all R2 audio through the server-side proxy to avoid CORS / 400 issues. */
function proxyAudioUrl(url: string | null): string | null {
  if (!url) return null;
  return `/api/audio/serve?url=${encodeURIComponent(url)}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StallDetailAudioNarration({ viAudioUrl, enAudioUrl }: StallDetailAudioNarrationProps) {
  const [lang, setLang] = useState<"en" | "vi">(enAudioUrl ? "en" : "vi");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!viAudioUrl && !enAudioUrl) return null;

  const rawSrc = lang === "en" ? enAudioUrl : viAudioUrl;
  const src = proxyAudioUrl(rawSrc);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
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

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Audio Narration</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Language selector */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Language / Nation</p>
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as "en" | "vi");
                setPlaying(false);
                setProgress(0);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {enAudioUrl && <option value="en">English (International)</option>}
              {viAudioUrl && <option value="vi">Vietnamese</option>}
            </select>
          </div>

          {/* Player */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Narration Audio</p>
            {src ? (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <button
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shrink-0 transition"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 accent-orange-500 h-1 cursor-pointer"
                />
                <span className="text-xs text-gray-400 shrink-0">
                  {duration ? formatTime(duration) : "--:--"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                No audio available
              </p>
            )}
          </div>
        </div>

        {/* Hidden audio element */}
        {src && (
          <audio
            key={src}
            ref={audioRef}
            src={src}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => { setPlaying(false); setProgress(0); }}
          />
        )}
      </div>
    </section>
  );
}
