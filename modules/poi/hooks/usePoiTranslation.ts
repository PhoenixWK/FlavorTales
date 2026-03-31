"use client";

import { useState, useCallback } from "react";
import {
  translatePoi,
  translateShop,
  type PoiLanguageResult,
  type ShopLanguageResult,
  type TranslationLanguage,
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

  const runTranslation = useCallback(
    async (poiId: number, shopId: number) => {
      setState({ loading: true, poiResults: [], shopResults: [], errors: {}, completed: false });

      try {
        const [poiResults, shopResults] = await Promise.all([
          translatePoi(poiId),
          translateShop(shopId),
        ]);

        const errors: Partial<Record<TranslationLanguage, string>> = {};
        for (const r of [...poiResults, ...shopResults]) {
          if (!r.success && r.errorMessage) {
            errors[r.language as TranslationLanguage] = r.errorMessage;
          }
        }

        setState({ loading: false, poiResults, shopResults, errors, completed: true });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          completed: true,
          errors: { english: (err as Error).message },
        }));
      }
    },
    []
  );

  return { ...state, runTranslation };
}
