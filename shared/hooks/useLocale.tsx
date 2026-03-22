"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Locale = "vi" | "zh" | "en";

export interface LocaleOption {
  code: Locale;
  label: string;
  flag: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const STORAGE_KEY = "ft_locale";
const DEFAULT_LOCALE: Locale = "vi";

// ── Context ───────────────────────────────────────────────────────────────────

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALE_OPTIONS.some((o) => o.code === stored)) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
