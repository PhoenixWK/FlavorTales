"use client";

import { useMemo } from "react";
import { Marker, Circle } from "react-leaflet";
import L from "leaflet";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";

// ── Icon factory ──────────────────────────────────────────────────────────────

const CONTAINER = 40;
const CENTER = CONTAINER / 2;
const DOT = 14;
const HALF_DOT = DOT / 2;

/**
 * Builds a Leaflet DivIcon with:
 * - Blue pulsing dot (.ft-user-dot)
 * - Direction arrow (SVG polygon) rotated to heading — shown only when moving
 */
function buildUserIcon(
  heading: number | null | undefined,
  isMoving: boolean
): L.DivIcon {
  const showArrow =
    isMoving && typeof heading === "number" && !isNaN(heading);

  const arrowSvg = showArrow
    ? `<svg width="${CONTAINER}" height="${CONTAINER}"
         style="position:absolute;top:0;left:0;pointer-events:none;overflow:visible"
         aria-hidden="true">
         <polygon
           points="${CENTER},${CENTER - 18} ${CENTER - 5},${CENTER - 8} ${CENTER + 5},${CENTER - 8}"
           fill="#3B82F6"
           opacity="0.85"
           transform="rotate(${heading},${CENTER},${CENTER})"
         />
       </svg>`
    : "";

  return L.divIcon({
    className: "", // clear Leaflet's default wrapper styles
    html: `<div style="position:relative;width:${CONTAINER}px;height:${CONTAINER}px;">
             ${arrowSvg}
             <div class="ft-user-dot"
                  style="position:absolute;
                         top:${CENTER - HALF_DOT}px;
                         left:${CENTER - HALF_DOT}px;
                         width:${DOT}px;
                         height:${DOT}px;">
             </div>
           </div>`,
    iconSize: [CONTAINER, CONTAINER],
    iconAnchor: [CENTER, CENTER],
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  coordinates: UserCoordinates;
}

/**
 * FR-LM-005 §3: Renders the tourist's position on the Leaflet map with:
 * - Pulsing blue dot
 * - Transparent accuracy circle
 * - Direction arrow when the device is moving (speed > 0.5 m/s)
 *
 * Must be rendered inside a react-leaflet <MapContainer>.
 */
export default function UserLocationMarker({ coordinates }: Props) {
  const { latitude, longitude, accuracy, heading, speed } = coordinates;
  const position: [number, number] = [latitude, longitude];
  const isMoving = typeof speed === "number" && speed > 0.5;

  const icon = useMemo(
    () => buildUserIcon(heading, isMoving),
    [heading, isMoving]
  );

  return (
    <>
      {/* Accuracy circle — transparent fill with subtle blue border */}
      {typeof accuracy === "number" && accuracy > 0 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: "#3B82F6",
            fillColor: "#3B82F6",
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.35,
          }}
        />
      )}

      {/* Pulsing dot + optional direction arrow */}
      <Marker position={position} icon={icon} />
    </>
  );
}
