"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useUserLocation, type LocationStatus } from "@/shared/hooks/useUserLocation";
import { BOUNDARY_CENTER } from "@/modules/poi/components/MapPicker";

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

// ── Fly-to controller (must live inside MapContainer) ────────────────────────

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 1.2 });
  }, [map, target]);
  return null;
}

// ── Status banner ─────────────────────────────────────────────────────────────

const STATUS_MESSAGES: Partial<Record<LocationStatus, string>> = {
  loading: "Đang xác định vị trí…",
  denied: "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
  unavailable: "Thiết bị của bạn không hỗ trợ định vị GPS.",
  error: "Không thể lấy vị trí. Hãy thử lại.",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * UC-10: Tourist-facing map that shows the user's current GPS position.
 *
 * The "Vị trí của tôi" button triggers the browser Geolocation API;
 * on success the map flies to the user's coordinates and places a marker.
 */
const TouristMap = memo(function TouristMap() {
  useFixLeafletIcons();

  const { coordinates, status, requestLocation } = useUserLocation();

  const userPosition: [number, number] | null = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : null;

  // Fly target: set once when coordinates arrive
  const flyTarget = useRef<[number, number] | null>(null);
  if (userPosition && flyTarget.current === null) {
    flyTarget.current = userPosition;
  }

  const userIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: "/marker-icon.png",
        iconRetinaUrl: "/marker-icon-2x.png",
        shadowUrl: "/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

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

          {/* Fly to user position when coordinates arrive */}
          <FlyTo target={userPosition} />

          {/* User-position marker */}
          {userPosition && (
            <Marker position={userPosition} icon={userIcon} />
          )}
        </MapContainer>
      </div>

      {/* "My Location" button — overlayed on the map */}
      <button
        onClick={requestLocation}
        disabled={status === "loading"}
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
        {/* Simple crosshair / location icon using plain SVG */}
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
        {status === "loading" ? "Đang xác định…" : "Vị trí của tôi"}
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
