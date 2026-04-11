"use client";

import { useEffect, useRef, useState } from "react";
import { useGpsProvider } from "@/modules/location/hooks/useGpsProvider";
import { useToast } from "@/shared/hooks/useToast";
import { LocationProvider } from "@/modules/location/context/LocationContext";
import LocationPermissionScreen from "./LocationPermissionScreen";
import MockGpsPanel from "@/modules/location/components/MockGpsPanel";

const BYPASS_KEY = "ft_location_bypassed";
/** Set to "true" once the user has successfully granted GPS — persists across tab switches. */
const GRANTED_KEY = "ft_location_granted";
const IS_MOCK_GPS = process.env.NEXT_PUBLIC_MOCK_GPS === "true";

/**
 * UC-10 / FR-LM-005: Guards the map behind a location-permission prompt.
 *
 * Persistence behaviour:
 * - Once GPS is granted, `ft_location_granted` is written to localStorage so
 *   the gate is skipped on subsequent mounts (tab switch, app background/restore).
 * - If the browser permission is revoked externally, the Permissions API
 *   `change` event clears the key and re-shows the gate immediately.
 * - The user's "skip" decision is still honoured via `ft_location_bypassed`.
 */
export default function LocationPermissionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const locationState = useGpsProvider();
  const { status, requestLocation } = locationState;
  const { addToast } = useToast();
  // Initialise synchronously so there is no flash of the permission screen
  // when the user switches tabs or restores the app from background.
  const [bypassed, setBypassed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(BYPASS_KEY) === "true" ||
      localStorage.getItem(GRANTED_KEY) === "true"
    );
  });
  const [permissionRevoked, setPermissionRevoked] = useState(false);
  const permStatusRef = useRef<PermissionStatus | null>(null);

  // Monitor for external permission revocation via the Permissions API.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;

    navigator.permissions.query({ name: "geolocation" }).then((ps) => {
      permStatusRef.current = ps;
      ps.onchange = () => {
        if (ps.state === "denied") {
          localStorage.removeItem(GRANTED_KEY);
          localStorage.removeItem(BYPASS_KEY);
          setBypassed(false);
          setPermissionRevoked(true);
        } else {
          setPermissionRevoked(false);
        }
      };
    });

    return () => {
      if (permStatusRef.current) {
        permStatusRef.current.onchange = null;
      }
    };
  }, []);

  // Persist granted state when GPS succeeds.
  useEffect(() => {
    if (status === "success") {
      localStorage.setItem(GRANTED_KEY, "true");
      setPermissionRevoked(false);
    } else if (status === "error") {
      addToast("error", "Không thể xác định vị trí. Vui lòng thử lại.", 5000);
    }
  }, [status, addToast]);

  const handleSkip = () => {
    localStorage.setItem(BYPASS_KEY, "true");
    setBypassed(true);
  };

  // Show the map whenever we have a result (good or bad) or the user opted out,
  // unless the browser permission was revoked (in which case re-show the gate).
  const showMap =
    !permissionRevoked &&
    (status === "success" ||
      status === "searching" ||
      status === "denied" ||
      status === "unavailable" ||
      status === "error" ||
      bypassed);

  if (showMap) {
    return (
      <LocationProvider value={locationState}>
        {IS_MOCK_GPS && <MockGpsPanel />}
        {children}
      </LocationProvider>
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
