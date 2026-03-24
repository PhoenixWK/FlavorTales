"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, LOCALE_OPTIONS, type Locale } from "@/shared/hooks/useLocale";

/**
 * Globe icon button that opens a language-selection dropdown.
 * Closes on outside click or Escape.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleSelect(code: Locale) {
    setLocale(code);
    setOpen(false);
  }

  const current = LOCALE_OPTIONS.find((o) => o.code === locale);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Chọn ngôn ngữ"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5
          text-sm text-gray-600 shadow-sm hover:bg-orange-50 hover:border-orange-300
          hover:text-orange-600 transition-colors"
      >
        <GlobeIcon />
        <span className="hidden sm:inline">{current?.flag} {current?.label}</span>
        <span className="sm:hidden">{current?.flag}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul
          role="listbox"
          aria-label="Ngôn ngữ"
          className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
          style={{ zIndex: 10000 }}
        >
          {LOCALE_OPTIONS.map((option) => (
            <li key={option.code}>
              <button
                role="option"
                aria-selected={locale === option.code}
                onClick={() => handleSelect(option.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left
                  hover:bg-orange-50 transition-colors
                  ${locale === option.code ? "bg-orange-50 font-semibold text-orange-600" : "text-gray-700"}`}
              >
                <span className="text-base">{option.flag}</span>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
