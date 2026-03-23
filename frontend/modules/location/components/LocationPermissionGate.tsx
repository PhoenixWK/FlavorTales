"use client";

import { useEffect, useState } from "react";
import { useUserLocation } from "@/shared/hooks/useUserLocation";
import { useToast } from "@/shared/hooks/useToast";
import { LocationProvider } from "@/modules/location/context/LocationContext";
import LocationPermissionScreen from "./LocationPermissionScreen";

const BYPASS_KEY = "ft_location_bypassed";

/**
 * UC-10 / FR-LM-005: Guards the map behind a location-permission prompt.
 *
 * - Owns the single useUserLocation instance and exposes it via LocationProvider
 *   so TouristMap can share state without creating a second GPS watch.
 * - Persists the user's "skip" decision in localStorage (FR-LM-005 §1).
 * - Shows the map (without a user marker) when GPS is denied or unavailable,
 *   per FR-LM-005 §5.
 * - Shows <LocationPermissionScreen> only while status is "idle" or "loading".
 */
export default function LocationPermissionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const locationState = useUserLocation();
  const { status, requestLocation } = locationState;
  const { addToast } = useToast();
  const [bypassed, setBypassed] = useState(false);

  // Read persisted bypass decision on the client (avoid SSR hydration mismatch)
  useEffect(() => {
    if (localStorage.getItem(BYPASS_KEY) === "true") {
      setBypassed(true);
    }
  }, []);

  useEffect(() => {
    if (status === "error") {
      addToast("error", "Không thể xác định vị trí. Vui lòng thử lại.", 5000);
    }
  }, [status, addToast]);

  const handleSkip = () => {
    localStorage.setItem(BYPASS_KEY, "true");
    setBypassed(true);
  };

  // Show the map whenever we have a result (good or bad) or the user opted out.
  // FR-LM-005 §5: denied → show map without marker + explanation banner in TouristMap.
  const showMap =
    status === "success" ||
    status === "searching" ||
    status === "denied" ||
    status === "unavailable" ||
    status === "error" ||
    bypassed;

  if (showMap) {
    return (
      <LocationProvider value={locationState}>{children}</LocationProvider>
    );
  }

  return (
    <LocationPermissionScreen
      onAllow={requestLocation}
      onSkip={handleSkip}
      isLoading={status === "loading"}
    />
  );
}
