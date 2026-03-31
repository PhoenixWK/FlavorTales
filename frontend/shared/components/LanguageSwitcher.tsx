"use client";

export type TranslationLanguage = "vi" | "en" | "ko" | "zh" | "ru" | "ja";

export const TRANSLATION_LANGUAGES: {
  code: TranslationLanguage;
  label: string;
  flag: string;
}[] = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

interface Props {
  selected: TranslationLanguage;
  onChange: (lang: TranslationLanguage) => void;
  className?: string;
}

export default function LanguageSwitcher({ selected, onChange, className }: Props) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {TRANSLATION_LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${
              selected === code
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
