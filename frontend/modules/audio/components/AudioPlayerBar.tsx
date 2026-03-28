"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioContext } from "@/modules/audio/context/AudioContext";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import AudioMiniButton, { MINI_BUTTON_SIZE } from "@/modules/audio/components/AudioMiniButton";

// ── Positioning constants ─────────────────────────────────────────────────────
const MARGIN       = 12;
const PANEL_WIDTH  = 320;
const PANEL_GAP    = 8;
/** Approx panel height — used to decide whether to flip below the button */
const PANEL_APPROX_HEIGHT = 72;

// ── AudioPlayerPanel (private — only used by AudioPlayerBar) ─────────────────

interface PanelProps {
  anchorPos: { x: number; y: number };
  /** True while the exit animation is running (200 ms). */
  closing: boolean;
  name: string;
  image: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  isCompleted: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ratio: number) => void;
}

/**
 * Expanded player panel anchored above/below the AudioMiniButton.
 * - Clamps horizontally so it never overflows the viewport.
 * - Flips below the button when the button is near the top of the screen.
 * - Animates in/out with opacity + translateY (200 ms).
 */
function AudioPlayerPanel({
  anchorPos, closing,
  name, image,
  isPlaying, isLoading, isCompleted, progress,
  onPlay, onPause, onSeek,
}: PanelProps) {
  const [appear, setAppear] = useState(false);

  useEffect(() => {
    if (!closing) {
      const id = requestAnimationFrame(() => setAppear(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAppear(false);
    }
  }, [closing]);

  // Horizontal: centre on the button, clamp within viewport
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 400;
  const idealLeft = anchorPos.x + MINI_BUTTON_SIZE / 2 - PANEL_WIDTH / 2;
  const left = Math.max(MARGIN, Math.min(idealLeft, viewportWidth - PANEL_WIDTH - MARGIN));

  // Vertical: flip below when button is too close to the top edge
  const showBelow = anchorPos.y < PANEL_APPROX_HEIGHT + PANEL_GAP + MARGIN;
  const topPx     = showBelow
    ? anchorPos.y + MINI_BUTTON_SIZE + PANEL_GAP
    : anchorPos.y;

  const finalTranslate  = showBelow ? "0px"    : `calc(-100% - ${PANEL_GAP}px)`;
  const hiddenTranslate = showBelow ? "-12px"  : `calc(-100% - ${PANEL_GAP}px + 12px)`;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      style={{
        left,
        top: topPx,
        width: PANEL_WIDTH,
        transform: `translateY(${appear ? finalTranslate : hiddenTranslate})`,
        opacity: appear ? 1 : 0,
        transition: "opacity 200ms ease-out, transform 200ms ease-out",
      }}
      className="fixed z-1300 bg-gray-900 text-white rounded-2xl px-3 py-2 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-orange-500 flex items-center justify-center">
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          )}
        </div>

        {/* Track info + progress */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{name}</p>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            onClick={handleSeek}
            className="mt-1.5 h-1.5 bg-gray-600 rounded-full overflow-hidden cursor-pointer"
          >
            {isLoading ? (
              <div className="h-full w-1/3 bg-orange-400 rounded-full animate-pulse" />
            ) : (
              <div
                className="h-full bg-orange-500 rounded-full transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Play / Pause / Replay */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? "Dừng" : isCompleted ? "Phát lại" : "Phát"}
          className="h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center shrink-0 transition-colors"
        >
          {isPlaying ? (
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : isCompleted ? (
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultPos(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 350, y: MARGIN };
  return { x: window.innerWidth - MINI_BUTTON_SIZE - MARGIN, y: MARGIN };
}

interface Props {
  pois: TouristPoi[];
}

/**
 * FR-LM-008: Orchestrates the audio player UI.
 * — AudioMiniButton: always-visible draggable icon (when audio is active).
 * — AudioPlayerPanel: expanded player anchored above/below the button.
 * Tapping the button toggles the panel with a 200 ms fade+slide animation.
 */
export default function AudioPlayerBar({ pois }: Props) {
  const { playState, currentPoiId, play, pause, progress, seek } = useAudioContext();

  const [pos, setPos]         = useState<{ x: number; y: number }>(getDefaultPos);
  const [expanded, setExpanded]   = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-expand automatically when a new POI audio starts
  const prevPoiIdRef = useRef(currentPoiId);
  useEffect(() => {
    if (currentPoiId !== prevPoiIdRef.current) {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
      setExpanded(true);
      setIsClosing(false);
      prevPoiIdRef.current = currentPoiId;
    }
  }, [currentPoiId]);

  // Clamp button within viewport when screen resizes
  useEffect(() => {
    function handleResize() {
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth  - MINI_BUTTON_SIZE - MARGIN),
        y: Math.min(p.y, window.innerHeight - MINI_BUTTON_SIZE - MARGIN),
      }));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => { if (closingTimerRef.current) clearTimeout(closingTimerRef.current); };
  }, []);

  if (playState === "idle") return null;

  const poi         = pois.find((p) => p.poiId === currentPoiId);
  const name        = poi?.linkedShopName ?? poi?.name ?? "Audio";
  const image       = poi?.linkedShopAvatarUrl ?? null;
  const isPlaying   = playState === "playing" || playState === "finishing";
  const isLoading   = playState === "loading";
  const isCompleted = playState === "paused" && progress >= 0.98;

  function handleToggle() {
    if (expanded) {
      // Start exit animation; then actually hide after 200 ms
      setIsClosing(true);
      closingTimerRef.current = setTimeout(() => {
        setExpanded(false);
        setIsClosing(false);
      }, 200);
    } else {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
      setIsClosing(false);
      setExpanded(true);
    }
  }

  return (
    <>
      {(expanded || isClosing) && (
        <AudioPlayerPanel
          anchorPos={pos}
          closing={isClosing}
          name={name}
          image={image}
          isPlaying={isPlaying}
          isLoading={isLoading}
          isCompleted={isCompleted}
          progress={progress}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
        />
      )}
      <AudioMiniButton
        pos={pos}
        onPositionChange={setPos}
        expanded={expanded && !isClosing}
        onToggle={handleToggle}
        isPlaying={isPlaying}
      />
    </>
  );
}
