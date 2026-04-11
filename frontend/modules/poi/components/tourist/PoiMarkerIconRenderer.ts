import L from "leaflet";
import type { TouristPoi, MarkerState } from "@/modules/poi/types/touristPoi";

// ─────────────────────────────────────────────────────────────────────────────
//  Icon path generators
//  All paths are drawn inside a 44×52 viewBox.
//  The white inner circle occupies cx=22, cy=20, r=15 — so icons should fit
//  roughly inside the bounding box (13–31, 11–29).
// ─────────────────────────────────────────────────────────────────────────────

type IconPathFn = (color: string) => string;

/**
 * Bình dân — fork + knife (universal restaurant symbol).
 */
const iconForkKnife: IconPathFn = (c) =>
  `<path d="M16,10 L16,16 M14,10 L14,16 M18,10 L18,16 M14,16 Q16,19 18,16 M16,19 L16,30"
     stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
   <path d="M26,10 L26,30"
     stroke="${c}" stroke-width="2" stroke-linecap="round"/>
   <path d="M26,10 Q31,14 26,19"
     stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none"/>`;

/**
 * Gia truyền — noodle bowl with three steam wisps.
 */
const iconBowl: IconPathFn = (c) =>
  `<path d="M11,19 Q13,28 22,28 Q31,28 33,19 Z"
     fill="${c}" fill-opacity="0.85"/>
   <line x1="11" y1="19" x2="33" y2="19"
     stroke="${c}" stroke-width="2"/>
   <path d="M17,18 C17,15 17,12 17.5,10"
     stroke="${c}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
   <path d="M22,18 C22,15 22,12 22,10"
     stroke="${c}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
   <path d="M27,18 C27,15 27,12 26.5,10"
     stroke="${c}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;

/**
 * Chay — stylised leaf.
 */
const iconLeaf: IconPathFn = (c) =>
  `<path d="M22,10 C15,12 11,18 13,24 C15,29 22,30 22,30 C22,30 29,29 31,24 C33,18 29,12 22,10 Z"
     fill="${c}" fill-opacity="0.85"/>
   <line x1="22" y1="30" x2="22" y2="33"
     stroke="${c}" stroke-width="2" stroke-linecap="round"/>
   <line x1="22" y1="11" x2="22" y2="29"
     stroke="#fff" stroke-width="1" stroke-opacity="0.4"/>`;

/**
 * Hải sản — fish (body ellipse + fan tail + white eye).
 */
const iconSeafood: IconPathFn = (c) =>
  `<ellipse cx="18" cy="20" rx="8" ry="5.5"
     fill="${c}" fill-opacity="0.9"/>
   <path d="M26,20 L33,14 L33,26 Z"
     fill="${c}"/>
   <circle cx="13" cy="18.5" r="1.5"
     fill="#fff"/>`;

/**
 * Đặc sản vùng miền — five-point star.
 */
const iconStar: IconPathFn = (c) =>
  `<polygon
     points="22,10 24.5,17 32,17 26,21.5 28.5,28.5 22,24 15.5,28.5 18,21.5 12,17 19.5,17"
     fill="${c}" fill-opacity="0.9"/>`;

/**
 * Audio — five vertical waveform bars (tallest in the centre).
 */
const iconAudio: IconPathFn = (c) =>
  `<path d="M14,18 L14,22 M18,15 L18,25 M22,11 L22,29 M26,15 L26,25 M30,18 L30,22"
     stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;

/**
 * Default — same as fork+knife (generic food place).
 */
const iconDefault: IconPathFn = iconForkKnife;

// ─────────────────────────────────────────────────────────────────────────────
//  Tag → icon mapping  (mirrors the rules in poiIconFactory.ts)
// ─────────────────────────────────────────────────────────────────────────────

function pickIcon(tags: string[] | null | undefined, hasAudio: boolean): IconPathFn {
  if (tags && tags.length > 0) {
    const tag = tags[0];
    if (tag.includes("Hải sản"))    return iconSeafood;
    if (tag.includes("Chay"))       return iconLeaf;
    if (tag.includes("Gia truyền")) return iconBowl;
    if (tag === "Bình dân")         return iconForkKnife;
    if (tag.includes("Đặc sản"))   return iconStar;
  }
  return hasAudio ? iconAudio : iconDefault;
}

// ─────────────────────────────────────────────────────────────────────────────
//  State configuration
// ─────────────────────────────────────────────────────────────────────────────

interface StateConfig {
  color:   string;
  w:       number;
  h:       number;
  opacity: number;
}

const STATE_CONFIG: Record<MarkerState, StateConfig> = {
  default:  { color: "#F97316", w: 52, h: 62, opacity: 1    },
  selected: { color: "#EAB308", w: 62, h: 74, opacity: 1    },
  visited:  { color: "#9CA3AF", w: 52, h: 62, opacity: 0.55 },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SVG builder
//  Shape: coloured outer ring (r=18) + white inner disc (r=15) +
//         pointed tail triangle anchored at the marker's exact map position.
// ─────────────────────────────────────────────────────────────────────────────

function buildMarkerSvg(cfg: StateConfig, iconPaths: string): string {
  const { color, w, h, opacity } = cfg;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${w}" height="${h}" viewBox="0 0 44 52" ` +
    `style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));opacity:${opacity}">` +
    // ── Pointed tail ──────────────────────────────────────────────────────
    `<path d="M15,37 L22,51 L29,37 Z" fill="${color}"/>` +
    // ── Coloured outer ring ───────────────────────────────────────────────
    `<circle cx="22" cy="20" r="19" fill="${color}"/>` +
    // ── White face ────────────────────────────────────────────────────────
    `<circle cx="22" cy="20" r="15.5" fill="#fff"/>` +
    // ── Category icon ─────────────────────────────────────────────────────
    iconPaths +
    `</svg>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a Google-Maps-style circular Leaflet DivIcon for a POI marker.
 *
 * Visual: white disc with a coloured ring, a small downward-pointing tail,
 * and a category-specific icon inside the disc.
 * The icon style varies by shop tag (Bình dân, Gia truyền, Chay,
 * Hải sản, Đặc sản vùng miền) or falls back to audio/generic.
 *
 * Marker states:
 *   default  → orange  (#F97316), 44×52 px
 *   selected → yellow  (#EAB308), 52×62 px (enlarged)
 *   visited  → grey    (#9CA3AF), 44×52 px, 55% opacity
 *
 * iconAnchor is set to the bottom-centre (tip of the tail) so the marker
 * points to the exact map coordinate.
 */
export function buildPoiMarkerIcon(poi: TouristPoi, state: MarkerState): L.DivIcon {
  const cfg     = STATE_CONFIG[state];
  const iconFn  = pickIcon(poi.shopTags, poi.hasApprovedAudio === true);
  const svg     = buildMarkerSvg(cfg, iconFn(cfg.color));
  const { w, h } = cfg;

  return L.divIcon({
    html:        `<div style="width:${w}px;height:${h}px">${svg}</div>`,
    className:   "",
    iconSize:    [w, h],
    iconAnchor:  [w / 2, h],
    popupAnchor: [0, -h],
  });
}
