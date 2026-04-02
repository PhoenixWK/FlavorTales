"use client";

import { useState, useEffect } from "react";
import type { PoiResponse } from "@/modules/poi/services/poiApi";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import {
  getPoiTranslation,
  getShopTranslation,
} from "@/modules/poi/services/translationApi";
import type { TranslationLanguage } from "@/shared/components/LanguageSwitcher";

interface UsePoiViewTranslationResult {
  displayPoi: PoiResponse;
  displayShop: ShopDetail;
  translationLoading: boolean;
}

export function usePoiViewTranslation(
  poi: PoiResponse,
  shop: ShopDetail,
  lang: TranslationLanguage
): UsePoiViewTranslationResult {
  const [displayPoi, setDisplayPoi] = useState<PoiResponse>(poi);
  const [displayShop, setDisplayShop] = useState<ShopDetail>(shop);
  const [translationLoading, setTranslationLoading] = useState(false);

  useEffect(() => {
    if (lang === "vi") {
      setDisplayPoi(poi);
      setDisplayShop(shop);
      return;
    }
    let cancelled = false;
    setTranslationLoading(true);
    Promise.all([
      getPoiTranslation(poi.poiId, lang),
      getShopTranslation(shop.shopId, lang),
    ])
      .then(([poiTrans, shopTrans]) => {
        if (cancelled) return;
        if (poiTrans) {
          setDisplayPoi((prev) => ({
            ...prev,
            name: poiTrans.name ?? prev.name,
            address: poiTrans.address ?? prev.address,
          }));
        }
        if (shopTrans) {
          setDisplayShop((prev) => ({
            ...prev,
            name: shopTrans.name ?? prev.name,
            description: shopTrans.description ?? prev.description,
            featuredDish: shopTrans.featuredDish ?? prev.featuredDish,
            cuisineStyle: shopTrans.cuisineStyle ?? prev.cuisineStyle,
          }));
        }
      })
      .catch(() => {/* keep original data on error */})
      .finally(() => {
        if (!cancelled) setTranslationLoading(false);
      });
    return () => { cancelled = true; };
  }, [lang, poi, shop]);

  return { displayPoi, displayShop, translationLoading };
}
