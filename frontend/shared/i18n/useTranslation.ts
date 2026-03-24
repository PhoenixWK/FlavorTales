import { useLocale } from "@/shared/hooks/useLocale";
import dict, { type TranslationKey } from "@/shared/i18n/translations";

/**
 * Returns a translation function `t(key)` scoped to the current locale.
 * Must be called inside <LocaleProvider>.
 */
export function useTranslation() {
  const { locale } = useLocale();
  return (key: TranslationKey): string => dict[locale][key];
}
