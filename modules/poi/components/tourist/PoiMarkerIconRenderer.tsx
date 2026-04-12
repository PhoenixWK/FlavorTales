import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import {
  Utensils,
  UtensilsCrossed,
  Leaf,
  Fish,
  Star,
  type LucideProps,
} from "lucide-react";
import type { TouristPoi, MarkerState } from "@/modules/poi/types/touristPoi";
import { getTagColor } from "@/modules/poi/constants/poiCategoryColors";

// ─────────────────────────────────────────────────────────────────────────────
//  Category → Lucide icon mapping
//  NOTE: audio state is intentionally NOT considered here — the category icon
//  should always display regardless of whether the tourist has played audio.
// ─────────────────────────────────────────────────────────────────────────────

type LucideIcon = React.FC<LucideProps>;

function pickLucideIcon(tags: string[] | null | undefined): LucideIcon {
  if (tags && tags.length > 0) {
    const tag = tags[0];
    if (tag.includes("Hải sản"))    return Fish;
    if (tag.includes("Chay"))       return Leaf;
    if (tag.includes("Gia truyền")) return UtensilsCrossed;
    if (tag === "Bình dân")         return Utensils;
    if (tag.includes("Đặc sản"))   return Star;
  }
  return Utensils;
}

// ─────────────────────────────────────────────────────────────────────────────
//  State configuration
//  Sizes are tuned for mobile (touch target recommendation: ≥ 44 px).
// ─────────────────────────────────────────────────────────────────────────────

interface StateConfig {
  w: number;
  h: number;
}

const STATE_CONFIG: Record<MarkerState, StateConfig> = {
  default:  { w: 64, h: 76 },
  selected: { w: 76, h: 90 },
  visited:  { w: 64, h: 76 },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Pin SVG
//  ViewBox: 0 0 56 68
//  Shape: white outer circle (r=26) + coloured inner circle (r=19) +
//         white downward-pointing tail.
//  Circle centre: (28, 28). Tail tip: (28, 66).
// ─────────────────────────────────────────────────────────────────────────────

function buildPinSvg(color: string, w: number, h: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${w}" height="${h}" viewBox="0 0 56 68" ` +
    `style="filter:drop-shadow(0 3px 8px rgba(0,0,0,.35))">` +
    // White tail
    `<path d="M18,48 L28,66 L38,48 Z" fill="#fff"/>` +
    // White outer ring
    `<circle cx="28" cy="28" r="26" fill="#fff"/>` +
    // Coloured inner circle
    `<circle cx="28" cy="28" r="19" fill="${color}"/>` +
    `</svg>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a Leaflet DivIcon for a tourist POI marker.
 *
 * Visual: white outer ring + category-coloured inner circle + white Lucide icon
 *         + white downward tail pointing to the exact map coordinate.
 *
 * Marker states:
 *   default  → category colour, 64×76 px
 *   selected → yellow (#EAB308), 76×90 px (enlarged)
 *   visited  → category colour, 64×76 px (identical to default)
 *
 * The category icon is always shown — audio playback state does not change it.
 */
export function buildPoiMarkerIcon(poi: TouristPoi, state: MarkerState): L.DivIcon {
  const { w, h } = STATE_CONFIG[state];
  const color     = state === "selected" ? "#EAB308" : getTagColor(poi.shopTags);

  // Centre the Lucide icon over the inner circle (viewBox centre: 28, 28)
  const iconSize = Math.round(w * 20 / 64);
  const iconLeft = Math.round(w / 2 - iconSize / 2);
  const iconTop  = Math.round(28 * h / 76 - iconSize / 2);

  const Icon    = pickLucideIcon(poi.shopTags);
  const iconSvg = renderToStaticMarkup(
    createElement(Icon, { size: iconSize, color: "#fff", strokeWidth: 2.2 })
  );

  const html =
    `<div style="position:relative;width:${w}px;height:${h}px">` +
    buildPinSvg(color, w, h) +
    `<div style="position:absolute;top:${iconTop}px;left:${iconLeft}px;line-height:0;pointer-events:none">${iconSvg}</div>` +
    `</div>`;

  return L.divIcon({
    html,
    className:   "",
    iconSize:    [w, h],
    iconAnchor:  [w / 2, h],
    popupAnchor: [0, -h],
  });
}
