"use client";

import { useState, useEffect } from "react";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import type { Locale } from "@/shared/hooks/useLocale";
import {
  getPoiTranslation,
  getShopTranslation,
} from "@/modules/poi/services/translationApi";

/** Maps UI locale to the translation language key used by the backend API. */
function toApiLang(locale: Locale): string | null {
  switch (locale) {
    case "en": return "english";
    case "ko": return "korean";
    case "zh": return "chinese";
    case "ru": return "russian";
    default:   return null; // "vi" and "ja" not supported — keep original
  }
}

export interface TouristPoiDisplay {
  name: string;
  address: string | undefined | null;
  shopName: string | undefined | null;
  shopDescription: string | undefined | null;
}

export function useTouristPoiTranslation(poi: TouristPoi, locale: Locale): {
  display: TouristPoiDisplay;
  translationLoading: boolean;
} {
  const [display, setDisplay] = useState<TouristPoiDisplay>({
    name: poi.name,
    address: poi.address,
    shopName: poi.linkedShopName,
    shopDescription: poi.shopDescription,
  });
  const [translationLoading, setTranslationLoading] = useState(false);

  useEffect(() => {
    const apiLang = toApiLang(locale);

    // Reset to original data whenever poi or locale changes
    setDisplay({
      name: poi.name,
      address: poi.address,
      shopName: poi.linkedShopName,
      shopDescription: poi.shopDescription,
    });

    if (!apiLang) return;

    let cancelled = false;
    setTranslationLoading(true);

    const requests: Promise<void>[] = [];

    const poiReq = getPoiTranslation(poi.poiId, apiLang)
      .then((trans) => {
        if (cancelled) return;
        setDisplay((prev) => ({
          ...prev,
          name: trans.name ?? prev.name,
          address: trans.address ?? prev.address,
        }));
      })
      .catch(() => {/* keep original */});

    requests.push(poiReq);

    if (poi.linkedShopId) {
      const shopReq = getShopTranslation(poi.linkedShopId, apiLang)
        .then((trans) => {
          if (cancelled) return;
          setDisplay((prev) => ({
            ...prev,
            shopName: trans.name ?? prev.shopName,
            shopDescription: trans.description ?? prev.shopDescription,
          }));
        })
        .catch(() => {/* keep original */});

      requests.push(shopReq);
    }

    Promise.allSettled(requests).finally(() => {
      if (!cancelled) setTranslationLoading(false);
    });

    return () => { cancelled = true; };
  }, [locale, poi]);

  return { display, translationLoading };
}
