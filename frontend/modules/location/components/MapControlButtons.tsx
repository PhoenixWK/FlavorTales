"use client";

import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { useLocale, LOCALE_OPTIONS, type Locale } from "@/shared/hooks/useLocale";
import type { LocationStatus } from "@/shared/hooks/useUserLocation";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  locationStatus: LocationStatus;
  onLocationClick: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Two stacked control buttons overlaid on the map (bottom-right):
 *   1. Language selector (globe icon → dropdown)
 *   2. Location button (crosshair icon)
 */
export default function MapControlButtons({ locationStatus, onLocationClick }: Props) {
  const { locale, setLocale } = useLocale();
  const [langOpen, setLangOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTracking = locationStatus === "loading" || locationStatus === "searching";
  const current = LOCALE_OPTIONS.find((o) => o.code === locale);

  // Close on outside click
  useEffect(() => {
    if (!langOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [langOpen]);

  // Close on Escape
  useEffect(() => {
    if (!langOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLangOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [langOpen]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 right-4 z-1000 flex flex-col items-center gap-2"
    >
      {/* Language dropdown — opens above the buttons */}
      {langOpen && (
        <ul
          role="listbox"
          aria-label="Ngôn ngữ"
          className="absolute bottom-full mb-2 right-0 w-52 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden"
          style={{ zIndex: 1001 }}
        >
          {LOCALE_OPTIONS.map((option) => (
            <li key={option.code}>
              <button
                role="option"
                aria-selected={locale === option.code}
                onClick={() => {
                  setLocale(option.code as Locale);
                  setLangOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                  hover:bg-orange-50 transition-colors
                  ${locale === option.code
                    ? "bg-orange-50 font-semibold text-orange-600"
                    : "text-gray-700"
                  }`}
              >
                <span className="text-base">{option.flag}</span>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Language button */}
      <button
        onClick={() => setLangOpen((v) => !v)}
        aria-label="Chọn ngôn ngữ"
        aria-expanded={langOpen}
        title={`Ngôn ngữ: ${current?.label}`}
        className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white shadow-lg
          border border-gray-200 text-blue-500
          hover:bg-gray-50
          transition-colors"
      >
        <Languages className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Location / crosshair button */}
      <button
        onClick={onLocationClick}
        disabled={isTracking}
        aria-label="Vị trí của tôi"
        title="Vị trí của tôi"
        className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white shadow-lg
          border border-gray-200 text-blue-500
          hover:bg-gray-50
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors"
      >
        {isTracking ? (
          <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        ) : (
          <CrosshairIcon />
        )}
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CrosshairIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 sm:h-6 sm:w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
