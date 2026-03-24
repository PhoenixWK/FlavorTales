"use client";

import dynamic from "next/dynamic";
import { useAnonymousSession } from "@/modules/location/hooks/useAnonymousSession";
import LocationPermissionGate from "@/modules/location/components/LocationPermissionGate";
import LanguageSwitcher from "@/modules/common/components/LanguageSwitcher";
import { useTranslation } from "@/shared/i18n/useTranslation";

/**
 * UC-10: Tourist map page — "Xác định vị trí người dùng trên bản đồ".
 *
 * On first render this page bootstraps an anonymous tourist session
 * (FR-UM-011), then renders the interactive map with GPS location support.
 * Leaflet is loaded dynamically (ssr: false) because it requires the browser DOM.
 */

function MapLoadingView() {
  const t = useTranslation();
  return (
    <div className="flex h-[calc(100vh-120px)] min-h-100 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 animate-pulse">
      {t("map.loading_map")}
    </div>
  );
}

const TouristMap = dynamic(
  () => import("@/modules/location/components/TouristMap"),
  { ssr: false, loading: MapLoadingView }
);

export default function MapPage() {
  const { isReady } = useAnonymousSession();
  const t = useTranslation();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">{t("map.title")}</h1>
        <LanguageSwitcher />
      </div>
      {isReady ? (
        <LocationPermissionGate>
          <TouristMap />
        </LocationPermissionGate>
      ) : (
        <div className="flex h-[calc(100vh-120px)] min-h-100 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 animate-pulse">
          {t("map.session_init")}
        </div>
      )}
    </main>
  );
}
