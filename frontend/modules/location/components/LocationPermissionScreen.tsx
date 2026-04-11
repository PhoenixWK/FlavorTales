"use client";

import { useTranslation } from "@/shared/i18n/useTranslation";
import LocationIllustration from "./LocationIllustration";

interface Props {
  onAllow: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

/**
 * UC-10: Full-screen prompt asking the user to grant GPS access.
 * Purely presentational  all logic lives in LocationPermissionGate.
 *
 * Layout: 50/50 split on md+, single-column centred on mobile.
 */
export default function LocationPermissionScreen({
  onAllow,
  onSkip,
  isLoading,
}: Props) {
  const t = useTranslation();
  return (
    <div
      className="flex rounded-xl overflow-hidden border border-gray-200"
      style={{ height: "calc(100dvh - 120px)", minHeight: 400 }}
    >
      {/* Left: illustration */}
      <div className="hidden md:flex w-1/2 bg-linear-to-br from-orange-300 to-orange-500 items-center justify-center">
        <LocationIllustration />
      </div>

      {/* Right: content  centred on both axes */}
      <div className="flex-1 md:w-1/2 bg-white flex flex-col items-center justify-center px-8 py-12 gap-6 text-center">
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-orange-500"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t("location.permission.heading")}</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-xs">
            {t("location.permission.body")}
          </p>
        </div>

        {/* Feature list  left-aligned text inside a centred container */}
        <ul className="space-y-4 text-left max-w-xs w-full">
          <li className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 w-4 h-4 shrink-0 text-orange-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-gray-800">{t("location.permission.feature1.title")}</p>
              <p className="text-xs text-gray-500">{t("location.permission.feature1.body")}</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 w-4 h-4 shrink-0 text-orange-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-gray-800">{t("location.permission.feature2.title")}</p>
              <p className="text-xs text-gray-500">{t("location.permission.feature2.body")}</p>
            </div>
          </li>
        </ul>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={onAllow}
            disabled={isLoading}
            className="w-full rounded-full bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? t("location.permission.allow_loading") : t("location.permission.allow")}
          </button>
          <button
            onClick={onSkip}
            className="py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t("location.permission.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}