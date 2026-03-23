"use client";

import { memo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type LocationStatus } from "@/shared/hooks/useUserLocation";
import { useLocationContext } from "@/modules/location/context/LocationContext";
import { BOUNDARY_CENTER } from "@/modules/poi/components/MapPicker";
import UserLocationMarker from "./UserLocationMarker";

// ── Leaflet icon fix (Next.js / webpack) ──────────────────────────────────────

function useFixLeafletIcons() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "/marker-icon.png",
      iconRetinaUrl: "/marker-icon-2x.png",
      shadowUrl: "/marker-shadow.png",
    });
  }, []);
}

// ── Map controller (must live inside MapContainer) ────────────────────────────

/**
 * Stores the Leaflet map instance in a ref so TouristMap can call flyTo
 * without extra child components.
 */
function MapController({
  mapRef,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

// ── Status banner messages ────────────────────────────────────────────────────

const STATUS_MESSAGES: Partial<Record<LocationStatus, string>> = {
  loading:     "Đang xác định vị trí…",
  searching:   "Đang tìm kiếm tín hiệu GPS…",
  denied:      "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
  unavailable: "Không xác định được vị trí.",
  error:       "Không thể lấy vị trí. Hãy thử lại.",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * UC-10 / FR-LM-005: Tourist-facing map with GPS position display.
 *
 * Reads GPS state from LocationContext (owned by LocationPermissionGate) so
 * there is exactly one watchPosition running at a time.
 * - First GPS fix → map flies to user position automatically.
 * - "Vị trí của tôi" button → re-centers map when tracking; starts tracking
 *   when not yet active.
 */
const TouristMap = memo(function TouristMap() {
  useFixLeafletIcons();

  const { coordinates, status, requestLocation } = useLocationContext();
  const mapRef = useRef<L.Map | null>(null);

  const userPosition: [number, number] | null = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : null;

  // Fly to user position exactly once when coordinates first arrive
  const firstFlyRef = useRef(false);
  useEffect(() => {
    if (userPosition && !firstFlyRef.current && mapRef.current) {
      firstFlyRef.current = true;
      mapRef.current.flyTo(userPosition, 16, { duration: 1.2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates]);

  const handleLocationButton = () => {
    if (status === "success" && userPosition && mapRef.current) {
      // Re-center map on current position
      mapRef.current.flyTo(userPosition, 16, { duration: 1.2 });
    } else {
      requestLocation();
    }
  };

  const isTracking = status === "loading" || status === "searching";
  const statusMessage = STATUS_MESSAGES[status];

  return (
    <div className="relative flex flex-col gap-2">
      {/* Map */}
      <div
        className="rounded-xl overflow-hidden border border-gray-200"
        style={{ height: "calc(100vh - 120px)", minHeight: 400 }}
      >
        <MapContainer
          center={BOUNDARY_CENTER}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          preferCanvas
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController mapRef={mapRef} />

          {/* User-position marker with pulse dot, accuracy circle, direction arrow */}
          {coordinates && <UserLocationMarker coordinates={coordinates} />}
        </MapContainer>
      </div>

      {/* "My Location" button — overlaid on the map */}
      <button
        onClick={handleLocationButton}
        disabled={isTracking}
        aria-label="Vị trí của tôi"
        className="
          absolute bottom-6 right-4 z-1000
          flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md
          border border-gray-200 text-sm font-medium text-gray-700
          hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {isTracking ? "Đang xác định…" : "Vị trí của tôi"}
      </button>

      {/* Status / error banner */}
      {statusMessage && (
        <p
          role="status"
          className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-2 text-sm text-orange-700"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
});

export default TouristMap;
