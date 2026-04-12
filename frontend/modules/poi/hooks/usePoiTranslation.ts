"use client";

import { useState, useCallback } from "react";
import {
  translatePoi,
  translateShop,
  previewTranslation,
  type PoiLanguageResult,
  type ShopLanguageResult,
  type TranslationLanguage,
  type TranslationPreviewRequest,
  type TranslationPreviewResponse,
} from "@/modules/poi/services/translationApi";

export interface TranslationState {
  loading: boolean;
  poiResults: PoiLanguageResult[];
  shopResults: ShopLanguageResult[];
  /** Languages that failed translation — keyed by language name */
  errors: Partial<Record<TranslationLanguage, string>>;
  completed: boolean;
}

export function usePoiTranslation() {
  const [state, setState] = useState<TranslationState>({
    loading: false,
    poiResults: [],
    shopResults: [],
    errors: {},
    completed: false,
  });

  const collectErrors = (results: Array<PoiLanguageResult | ShopLanguageResult>) => {
    const errors: Partial<Record<TranslationLanguage, string>> = {};
    for (const r of results) {
      if (!r.success && r.errorMessage) {
        errors[r.language as TranslationLanguage] = r.errorMessage;
      }
    }
    return errors;
  };

  /** Live preview: translates draft fields via /api/poi/translate/preview (no DB write). */
  const runPreview = useCallback(async (request: TranslationPreviewRequest) => {
    setState({ loading: true, poiResults: [], shopResults: [], errors: {}, completed: false });
    try {
      const preview: TranslationPreviewResponse = await previewTranslation(request);
      const errors = collectErrors([...preview.poiTranslations, ...preview.shopTranslations]);
      setState({
        loading: false,
        poiResults: preview.poiTranslations,
        shopResults: preview.shopTranslations,
        errors,
        completed: true,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        completed: true,
        errors: { english: (err as Error).message },
      }));
    }
  }, []);

  /** Post-submit: triggers DB-persist; consumes Redis cache if available. */
  const runTranslation = useCallback(async (poiId: number, shopId: number) => {
    setState({ loading: true, poiResults: [], shopResults: [], errors: {}, completed: false });
    try {
      const [poiResults, shopResults] = await Promise.all([
        translatePoi(poiId),
        translateShop(shopId),
      ]);
      const errors = collectErrors([...poiResults, ...shopResults]);
      setState({ loading: false, poiResults, shopResults, errors, completed: true });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        completed: true,
        errors: { english: (err as Error).message },
      }));
    }
  }, []);

  return { ...state, runPreview, runTranslation };
}

