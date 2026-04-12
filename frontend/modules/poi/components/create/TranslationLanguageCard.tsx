"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { PoiLanguageResult, ShopLanguageResult } from "@/modules/poi/services/translationApi";

export const LANGUAGE_META: Record<string, { label: string; flag: string; country: string }> = {
  english:  { flag: "🇺🇸", country: "United States",  label: "English"  },
  korean:   { flag: "🇰🇷", country: "South Korea",    label: "한국어"    },
  chinese:  { flag: "🇨🇳", country: "China",          label: "中文"     },
  russian:  { flag: "🇷🇺", country: "Russia",         label: "Русский"  },
  japanese: { flag: "🇯🇵", country: "Japan",          label: "日本語"   },
};

export const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface Props {
  poi?: PoiLanguageResult;
  shop?: ShopLanguageResult;
  index: number;
}

export default function TranslationLanguageCard({ poi, shop, index }: Props) {
  const language = poi?.language ?? shop?.language ?? "";
  const meta     = LANGUAGE_META[language] ?? { flag: "🌐", country: language, label: language };
  const failed   = (poi && !poi.success) || (shop && !shop.success);

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
      className={`rounded-2xl border p-4 shadow-sm ${
        failed
          ? "border-red-200 bg-red-50"
          : "border-orange-100 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{meta.flag}</span>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-gray-800 text-sm">{meta.country}</span>
          <span className="text-xs text-gray-500">{meta.label}</span>
        </div>
        {failed && (
          <span className="ml-auto text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
            Lỗi dịch
          </span>
        )}
        {!failed && (
          <span className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            ✓ Hoàn tất
          </span>
        )}
      </div>

      {failed ? (
        <p className="text-sm text-red-500">
          {poi?.errorMessage ?? shop?.errorMessage ?? "Không thể dịch ngôn ngữ này."}
        </p>
      ) : (
        <ul className="space-y-2 text-sm text-gray-700">
          {poi?.translatedName && (
            <li>
              <span className="text-gray-400 text-xs uppercase tracking-wide">POI</span>
              <p className="font-medium">{poi.translatedName}</p>
              {poi.translatedAddress && (
                <p className="text-gray-500 text-xs mt-0.5">{poi.translatedAddress}</p>
              )}
            </li>
          )}
          {shop?.translatedName && (
            <li className="pt-1 border-t border-gray-100">
              <span className="text-gray-400 text-xs uppercase tracking-wide">Gian hàng</span>
              <p className="font-medium">{shop.translatedName}</p>
              {shop.translatedDescription && (
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{shop.translatedDescription}</p>
              )}
              {shop.translatedCuisineStyle && (
                <p className="text-gray-400 text-xs mt-0.5">Phong cách: {shop.translatedCuisineStyle}</p>
              )}
            </li>
          )}
        </ul>
      )}
    </motion.div>
  );
}
