"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AddressSearch from "./AddressSearch";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Boundary center — geographic centre of Vietnam (mirrors backend poi.yml) */
export const BOUNDARY_CENTER: [number, number] = [16.000000, 107.500000];
/** Maximum allowed distance from centre (metres) — covers all of Vietnam */
export const BOUNDARY_RADIUS_M = 1_300_000;

// ── Fix Leaflet's broken default icon in webpack / Next.js ────────────────────

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
    if (target) map.flyTo(target, 18, { duration: 1.2 });
  }, [map, target]);
  return null;
}

// ── Click handler (must live inside MapContainer) ─────────────────────────────

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  radius: number;
  onChange: (lat: number, lng: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default memo(function MapPicker({ lat, lng, radius, onChange }: MapPickerProps) {
  useFixLeafletIcons();

  // Capture the initial center once on mount; MapContainer.center is not reactive.
  const initialCenter = useRef<[number, number]>(
    lat !== null && lng !== null ? [lat, lng] : BOUNDARY_CENTER
  );

  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const position: [number, number] | null =
    lat !== null && lng !== null ? [lat, lng] : null;

  const handleSearchSelect = useCallback((sLat: number, sLng: number) => {
    onChange(sLat, sLng);
    setFlyTarget([sLat, sLng]);
  }, [onChange]);

  const boundaryPathOptions = useMemo(() => ({
    color: "#f97316",
    weight: 2,
    dashArray: "6 4",
    fillColor: "#fed7aa",
    fillOpacity: 0.07,
  }), []);

  const markerCirclePathOptions = useMemo(() => ({
    color: "#ea580c",
    weight: 2,
    fillColor: "#fb923c",
    fillOpacity: 0.25,
  }), []);

  const markerEventHandlers = useMemo(() => ({
    dragend(e: L.LeafletEvent) {
      const pos = (e.target as L.Marker).getLatLng();
      onChange(pos.lat, pos.lng);
    },
  }), [onChange]);

  return (
    <div className="space-y-2">
      {/* Address search bar */}
      <AddressSearch onSelect={handleSearchSelect} />

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 360 }}>
        <MapContainer
          center={initialCenter.current}
          zoom={lat !== null && lng !== null ? 17 : 6}
          style={{ height: "100%", width: "100%" }}
          preferCanvas
        >
          {/* OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            keepBuffer={4}
            updateWhenZooming={false}
          />

          {/* Fly to geocoded result */}
          <FlyTo target={flyTarget} />

          {/* Allowed boundary — dashed orange ring */}
          <Circle
            center={BOUNDARY_CENTER}
            radius={BOUNDARY_RADIUS_M}
            pathOptions={boundaryPathOptions}
          />

          {/* Click anywhere on the map to place / move marker */}
          <ClickHandler onChange={onChange} />

          {/* Selected marker + POI radius preview */}
          {position && (
            <>
              <Marker
                position={position}
                draggable
                eventHandlers={markerEventHandlers}
              />
              <Circle
                center={position}
                radius={radius}
                pathOptions={markerCirclePathOptions}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-400">
        Tìm địa chỉ phía trên hoặc click trực tiếp lên bản đồ để ghim vị trí · Kéo marker để điều chỉnh chính xác hơn
      </p>
    </div>
  );
});
