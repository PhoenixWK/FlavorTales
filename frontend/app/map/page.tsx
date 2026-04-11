"use client";

import dynamic from "next/dynamic";
import { useAnonymousSession } from "@/modules/location/hooks/useAnonymousSession";
import LocationPermissionGate from "@/modules/location/components/LocationPermissionGate";
import MapLoadingScreen from "@/modules/location/components/MapLoadingScreen";

const TouristMap = dynamic(
  () => import("@/modules/location/components/TouristMap"),
  { ssr: false, loading: () => <MapLoadingScreen /> }
);

export default function MapPage() {
  const { isReady } = useAnonymousSession();

  if (!isReady) return <MapLoadingScreen />;

  return (
    <main className="min-h-screen">
      <LocationPermissionGate>
        <TouristMap />
      </LocationPermissionGate>
    </main>
  );
}
