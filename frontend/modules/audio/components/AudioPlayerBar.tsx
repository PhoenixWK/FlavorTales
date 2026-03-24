"use client";

import { useAudioContext } from "@/modules/audio/context/AudioContext";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";

interface Props {
  pois: TouristPoi[];
}

/**
 * FR-LM-008: Floating audio player bar rendered above the map.
 * - Desktop (sm:): bottom-centre of the map container.
 * - Mobile: top-centre (sits above the bottom-sheet detail panel).
 * Visible whenever audio is loading, playing, pausing, or finishing.
 */
export default function AudioPlayerBar({ pois }: Props) {
  const { playState, currentPoiId, currentLanguage, play, pause } =
    useAudioContext();

  if (playState === "idle") return null;

  const poi = pois.find((p) => p.poiId === currentPoiId);
  const name = poi?.linkedShopName ?? poi?.name ?? "Audio";
  const image = poi?.linkedShopAvatarUrl ?? null;
  const isPlaying = playState === "playing";

  return (
    <div
      className="
        absolute z-900 left-1/2 -translate-x-1/2
        top-4 sm:top-auto sm:bottom-6
        flex items-center gap-3
        bg-gray-900 text-white rounded-2xl px-3 py-2 shadow-2xl
        w-72 sm:w-80
      "
    >
      {/* Thumbnail */}
      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-orange-500 flex items-center justify-center">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <svg
            className="h-5 w-5 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
          </svg>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{name}</p>
        <div className="mt-1.5 h-1 bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gray-400 rounded-full transition-all ${
              isPlaying ? "w-1/2 animate-pulse" : "w-0"
            }`}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
          <span>Language</span>
          <span className="font-semibold bg-orange-500 text-white rounded-full px-2 py-0.5 text-[10px]">
            {currentLanguage}
          </span>
        </div>
      </div>

      {/* Play / Pause */}
      <button
        onClick={isPlaying ? pause : play}
        aria-label={isPlaying ? "Dừng" : "Phát"}
        className="h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center shrink-0 transition-colors"
      >
        {isPlaying ? (
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
