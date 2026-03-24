"use client";

import { useEffect } from "react";
import { Circle, useMap } from "react-leaflet";
import { useGeofenceContext } from "@/modules/location/context/GeofenceContext";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";

interface Props {
  pois: TouristPoi[];
}

/**
 * FR-LM-007 §5: Renders Leaflet Circles for POIs the tourist is currently
 * inside or in overlap with.
 *
 * - Green + pulsing: inside / grace_period state
 * - Blue + lighter:  overlap candidate (resolving)
 *
 * Must live inside a react-leaflet MapContainer.
 */
export default function GeofenceCircleLayer({ pois }: Props) {
  const { insidePois, overlappingPois } = useGeofenceContext();

  // Ensure we're inside a MapContainer (throws if not)
  useMap();

  // Inject pulse animation CSS once
  useEffect(() => {
    const STYLE_ID = "geofence-pulse-style";
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes geofence-pulse {
        0%   { opacity: 0.6; }
        50%  { opacity: 0.2; }
        100% { opacity: 0.6; }
      }
      .geofence-circle-inside path {
        animation: geofence-pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <>
      {pois.map((poi) => {
        const isInside  = insidePois.includes(poi.poiId);
        const isOverlap = overlappingPois.includes(poi.poiId);
        if (!isInside && !isOverlap) return null;

        return (
          <Circle
            key={poi.poiId}
            center={[poi.latitude, poi.longitude]}
            radius={poi.radius}
            pathOptions={{
              color:       isInside ? "#16a34a" : "#3b82f6",
              fillColor:   isInside ? "#22c55e" : "#93c5fd",
              fillOpacity: isInside ? 0.15 : 0.10,
              weight:      isInside ? 2 : 1,
              className:   isInside ? "geofence-circle-inside" : undefined,
            }}
          />
        );
      })}
    </>
  );
}
