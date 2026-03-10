"use client";

import { useEffect, useState } from "react";
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
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

export default function MapPicker({ lat, lng, radius, onChange }: MapPickerProps) {
  useFixLeafletIcons();

  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const position: [number, number] | null =
    lat !== null && lng !== null ? [lat, lng] : null;

  const handleSearchSelect = (sLat: number, sLng: number) => {
    onChange(sLat, sLng);
    setFlyTarget([sLat, sLng]);
  };

  return (
    <div className="space-y-2">
      {/* Address search bar */}
      <AddressSearch onSelect={handleSearchSelect} />

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 360 }}>
        <MapContainer
          center={BOUNDARY_CENTER}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
        >
          {/* OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fly to geocoded result */}
          <FlyTo target={flyTarget} />

          {/* Allowed boundary — dashed orange ring */}
          <Circle
            center={BOUNDARY_CENTER}
            radius={BOUNDARY_RADIUS_M}
            pathOptions={{
              color: "#f97316",
              weight: 2,
              dashArray: "6 4",
              fillColor: "#fed7aa",
              fillOpacity: 0.07,
            }}
          />

          {/* Click anywhere on the map to place / move marker */}
          <ClickHandler onChange={onChange} />

          {/* Selected marker + POI radius preview */}
          {position && (
            <>
              <Marker
                position={position}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const pos = (e.target as L.Marker).getLatLng();
                    onChange(pos.lat, pos.lng);
                  },
                }}
              />
              <Circle
                center={position}
                radius={radius}
                pathOptions={{
                  color: "#ea580c",
                  weight: 2,
                  fillColor: "#fb923c",
                  fillOpacity: 0.25,
                }}
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
}
