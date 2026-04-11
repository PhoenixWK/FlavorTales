"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocationContext } from "@/modules/location/context/LocationContext";
import { BOUNDARY_CENTER } from "@/modules/poi/components/MapPicker";
import UserLocationMarker from "./UserLocationMarker";
import MapControlButtons from "./MapControlButtons";
import { useTouristPois } from "@/modules/poi/hooks/useTouristPois";
import PoiMarkerLayer from "@/modules/poi/components/tourist/PoiMarkerLayer";
import PoiDetailPanel from "@/modules/poi/components/tourist/PoiDetailPanel";
import PoiHoverCard from "@/modules/poi/components/tourist/PoiHoverCard";
import PoiSearchBar from "@/modules/poi/components/tourist/PoiSearchBar";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import { useTranslation } from "@/shared/i18n/useTranslation";
import { GeofenceProvider } from "@/modules/location/context/GeofenceContext";
import { AudioProvider } from "@/modules/audio/context/AudioContext";
import GeofenceBanner from "@/modules/location/components/GeofenceBanner";
import GeofenceCircleLayer from "@/modules/poi/components/tourist/GeofenceCircleLayer";
import AudioPlayerBar from "@/modules/audio/components/AudioPlayerBar";

// ── Map initial view (street-level HCM City, independent of vendor MapPicker) ─

const MAP_INITIAL_CENTER: [number, number] = [10.748, 106.628];
const MAP_INITIAL_ZOOM = 14;

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

/**
 * Force Leaflet to recalculate container dimensions after mount.
 * This fixes a production build issue where Leaflet initialises before CSS
 * has fully applied, resulting in a 0-height container and the wrong initial
 * tile / zoom calculation.
 */
function MapSizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    // Two-step invalidation: immediate + after one frame
    map.invalidateSize();
    const raf = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * UC-10 / FR-LM-005: Tourist-facing map with GPS position display.
 * FR-LM-003 / FR-LM-004: POI markers, clustering, and popup card.
 *
 * Reads GPS state from LocationContext (owned by LocationPermissionGate) so
 * there is exactly one watchPosition running at a time.
 * - First GPS fix → map flies to user position automatically.
 * - "Vị trí của tôi" button → re-centers map when tracking; starts tracking
 *   when not yet active.
 */
const TouristMap = memo(function TouristMap() {
  useFixLeafletIcons();

  const t = useTranslation();
  const { coordinates, status, requestLocation } = useLocationContext();
  const mapRef = useRef<L.Map | null>(null);

  const { pois, selectedPoiId, visitedPoiIds, selectPoi } = useTouristPois();

  const selectedPoi = pois.find((p) => p.poiId === selectedPoiId) ?? null;

  // Search state — filters visible markers and is shared with the detail panel
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPois = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pois;
    return pois.filter((p) =>
      (p.linkedShopName ?? p.name).toLowerCase().includes(q)
    );
  }, [pois, searchQuery]);

  // Map container ref — used to convert Leaflet containerPoint → viewport coords
  const mapDivRef = useRef<HTMLDivElement>(null);

  // Hover card state (viewport-absolute pixel position)
  const [hoveredPoi, setHoveredPoi]   = useState<TouristPoi | null>(null);
  const [hoverPoint, setHoverPoint]   = useState<{ x: number; y: number } | null>(null);

  const handleHover = useCallback((poi: TouristPoi, point: { x: number; y: number }) => {
    const rect = mapDivRef.current?.getBoundingClientRect();
    const vp = rect
      ? { x: point.x + rect.left, y: point.y + rect.top }
      : point;
    setHoveredPoi(poi);
    setHoverPoint(vp);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoveredPoi(null);
    setHoverPoint(null);
  }, []);

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
      mapRef.current.flyTo(userPosition, 16, { duration: 1.2 });
    } else {
      requestLocation();
    }
  };

  return (
    <GeofenceProvider pois={pois}>
      <AudioProvider>
    <div className="relative flex flex-col gap-2">
      {/* Map */}
      <div
        ref={mapDivRef}
        className="overflow-hidden"
        style={{ height: "100dvh", minHeight: 400 }}
      >
        <MapContainer
          center={MAP_INITIAL_CENTER}
          zoom={MAP_INITIAL_ZOOM}
          zoomControl={false}
          style={{ height: "100%", width: "100%", background: "#e8e0d8" }}
          preferCanvas
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController mapRef={mapRef} />
          <MapSizeInvalidator />

          {/* User-position marker with pulse dot, accuracy circle, direction arrow */}
          {coordinates && <UserLocationMarker coordinates={coordinates} />}

          {/* FR-LM-003: POI markers with clustering */}
          <PoiMarkerLayer
            pois={filteredPois}
            selectedPoiId={selectedPoiId}
            visitedPoiIds={visitedPoiIds}
            onSelect={selectPoi}
            onHover={handleHover}
            onHoverEnd={handleHoverEnd}
          />

          {/* FR-LM-007: Geofence radius circles for POIs the user is inside */}
          <GeofenceCircleLayer pois={filteredPois} />
        </MapContainer>
      </div>

      {/* FR-LM-007/008: Geofence state banner (fixed position) */}
      <GeofenceBanner panelOpen={!!selectedPoi} />

      {/* FR-LM-008: Floating audio player — bottom-centre desktop, top-centre mobile */}
      <AudioPlayerBar pois={filteredPois} />

      {/* Hover preview card — uses fixed position (viewport coords) */}
      {hoveredPoi && hoverPoint && !selectedPoi && (
        <PoiHoverCard poi={hoveredPoi} position={hoverPoint} />
      )}

      {/* Floating search bar — always visible when no detail panel is open */}
      {!selectedPoi && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-1000">
          <PoiSearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t("poi.search_placeholder")} />
        </div>
      )}

      {/* FR-LM-004: Detail panel — left overlay on click */}
      {selectedPoi && (
        <PoiDetailPanel
          poi={selectedPoi}
          userCoordinates={coordinates}
          onClose={() => selectPoi(null)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Location + Language control buttons — overlaid bottom-right */}
      <MapControlButtons
        locationStatus={status}
        onLocationClick={handleLocationButton}
      />
    </div>
      </AudioProvider>
    </GeofenceProvider>
  );
});

export default TouristMap;
