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
      className={`flex items-center gap-2 bg-white rounded-full shadow-md border border-gray-200 px-3 py-2.5 ${className ?? ""}`}
    >
      <IconSearch className="h-4 w-4 text-gray-400 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
      />
      {value && (
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
      )}
    </div>
  );
}
