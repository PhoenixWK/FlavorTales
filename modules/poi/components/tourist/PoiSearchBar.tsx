"use client";

import { IconSearch } from "@/modules/poi/components/tourist/poiIcons";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Reusable search bar used both as a floating map overlay and inside
 * PoiDetailPanel's sticky header.
 */
export default function PoiSearchBar({
  value,
  onChange,
  placeholder = "Tìm kiếm quán ăn, món ăn…",
  className,
}: Props) {
  return (
    <div
      className={`flex items-center gap-3 bg-white rounded-full shadow-lg border border-gray-100 px-5 py-3.5 ${className ?? ""}`}
    >
      <IconSearch className="h-4 w-4 text-orange-400 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-base text-gray-700 placeholder-gray-400 outline-none bg-transparent"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Xóa tìm kiếm"
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <button
          aria-label="Tìm kiếm bằng giọng nói"
          className="shrink-0 text-orange-400 hover:text-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}
    </div>
  );
}
