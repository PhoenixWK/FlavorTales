import LanguageSwitcher, {
  type TranslationLanguage,
} from "@/shared/components/LanguageSwitcher";

interface Props {
  lang: TranslationLanguage;
  onChange: (lang: TranslationLanguage) => void;
  loading: boolean;
}

export default function PoiViewLanguageBar({ lang, onChange, loading }: Props) {
  return (
    <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
      <span className="text-xs font-medium text-gray-500 shrink-0">Language:</span>
      <LanguageSwitcher selected={lang} onChange={onChange} />
      {loading && (
        <span className="text-xs text-gray-400 ml-auto">Loading translation…</span>
      )}
    </div>
  );
}
