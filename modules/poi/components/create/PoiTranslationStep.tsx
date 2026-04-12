"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import type { TranslationState } from "@/modules/poi/hooks/usePoiTranslation";
import type { TranslationPreviewRequest } from "@/modules/poi/services/translationApi";
import TranslationLanguageCard from "./TranslationLanguageCard";
import TranslationLoadingAnimation from "./TranslationLoadingAnimation";

interface Props {
  draft: Pick<
    PoiCreateDraft,
    "poiName" | "address" | "shopName" | "shopDescription" | "specialtyDescription"
  >;
  translationState: TranslationState;
  runPreview: (request: TranslationPreviewRequest) => void;
}

const LANG_ORDER = ["english", "korean", "chinese", "russian", "japanese"];

export default function PoiTranslationStep({ draft, translationState, runPreview }: Props) {
  const { loading, poiResults, shopResults, errors, completed } = translationState;

  useEffect(() => {
    runPreview({
      poiName:         draft.poiName,
      poiAddress:      draft.address ?? undefined,
      shopName:        draft.shopName,
      shopDescription: draft.shopDescription ?? undefined,
      featuredDish:    draft.specialtyDescription ?? undefined,
    });
    // Only trigger once when the step mounts with stable draft values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Dịch thông tin POI</h3>
        <p className="text-sm text-gray-500">
          Nội dung POI và gian hàng đang được dịch sang các ngôn ngữ dưới đây. Vui lòng kiểm tra
          trước khi tiếp tục.
        </p>
      </div>

      {loading && <TranslationLoadingAnimation />}

      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {Object.keys(errors).length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Một số ngôn ngữ không thể dịch. Hệ thống sẽ thử lại sau khi nội dung được gửi duyệt.
              </p>
            )}
            {LANG_ORDER.map((lang, i) => {
              const poi  = poiResults.find((r) => r.language === lang);
              const shop = shopResults.find((r) => r.language === lang);
              return (
                <TranslationLanguageCard key={lang} poi={poi} shop={shop} index={i} />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

