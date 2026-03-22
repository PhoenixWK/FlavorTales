"use client";

import { useEffect, useState } from "react";
import { useUserLocation } from "@/shared/hooks/useUserLocation";
import { useToast } from "@/shared/hooks/useToast";
import LocationPermissionScreen from "./LocationPermissionScreen";

interface Props {
  children: React.ReactNode;
}

/**
 * UC-10: Guards the map behind a location-permission prompt.
 *
 * - Shows <LocationPermissionScreen> while status is "idle" or after a denial.
 * - Fires an error toast when the user refuses or an error occurs.
 * - Renders {children} (the map) once permission is granted or skipped.
 */
export default function LocationPermissionGate({ children }: Props) {
  const { status, requestLocation } = useUserLocation();
  const { addToast } = useToast();
  const [bypassed, setBypassed] = useState(false);

  useEffect(() => {
    if (status === "denied") {
      addToast(
        "error",
        "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
        5000
      );
    } else if (status === "error") {
      addToast("error", "Không thể xác định vị trí. Vui lòng thử lại.", 5000);
    }
  }, [status, addToast]);

  if (status === "success" || bypassed) {
    return <>{children}</>;
  }

  return (
    <LocationPermissionScreen
      onAllow={requestLocation}
      onSkip={() => setBypassed(true)}
      isLoading={status === "loading"}
    />
  );
}
