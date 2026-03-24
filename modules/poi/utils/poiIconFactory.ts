import L from "leaflet";
import type { TouristPoi, MarkerState } from "@/modules/poi/types/touristPoi";

// ── SVG symbol fragments ──────────────────────────────────────────────────────

/** Symbol rendered inside the pin circle (16×16 area centred at cx=16, cy=14) */
const SYMBOLS: Record<string, string> = {
  seafood: `<path d="M10 14c2-3 6-3 8 0M11 11.5c.5-.5 1-.8 2-.8s1.5.3 2 .8M18 14c.5.5.8 1 .8 1.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            <circle cx="10.5" cy="14" r="1" fill="#fff"/>`,
  leaf:    `<path d="M16 10c0 0-5 2-5 6s5 2 5-1c0 3 5 3 5-1s-5-6-5-6z" fill="#fff" fill-opacity="0.9"/>
            <line x1="16" y1="10" x2="16" y2="18" stroke="#fff" stroke-width="1" stroke-opacity="0.6"/>`,
  bowl:    `<path d="M11 13h10M12 13c0 3 8 3 8 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            <line x1="16" y1="10" x2="16" y2="13" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
  fork:    `<line x1="14" y1="10" x2="14" y2="18" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
            <line x1="18" y1="10" x2="18" y2="18" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M14 13h4" stroke="#fff" stroke-width="1.2"/>`,
  star:    `<polygon points="16,10 17.2,13.2 20.5,13.2 17.8,15.2 18.8,18.5 16,16.5 13.2,18.5 14.2,15.2 11.5,13.2 14.8,13.2" fill="#fff" fill-opacity="0.9"/>`,
  audio:   `<path d="M13 11v6M16 9v10M19 11v6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
  pin:     `<circle cx="16" cy="14" r="3" fill="#fff" fill-opacity="0.8"/>`,
};

function pickSymbol(tags: string[] | null | undefined, hasAudio: boolean): string {
  if (tags && tags.length > 0) {
    const t = tags[0];
    if (t.includes("Hải sản"))         return SYMBOLS.seafood;
    if (t.includes("Chay"))            return SYMBOLS.leaf;
    if (t.includes("Gia truyền"))      return SYMBOLS.bowl;
    if (t === "Bình dân")              return SYMBOLS.fork;
    if (t.includes("Đặc sản"))        return SYMBOLS.star;
  }
  return hasAudio ? SYMBOLS.audio : SYMBOLS.pin;
}

// ── Color map ─────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<MarkerState, { fill: string; size: [number, number]; opacity: number }> = {
  default:  { fill: "#F97316", size: [32, 40], opacity: 1 },
  selected: { fill: "#EAB308", size: [38, 48], opacity: 1 },
  visited:  { fill: "#9CA3AF", size: [32, 40], opacity: 0.5 },
};

// ── Icon factory ──────────────────────────────────────────────────────────────

function buildSvg(fill: string, symbol: string, w: number, h: number, opacity: number): string {
  // Scale the 32×40 viewBox if the icon is larger (selected state)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 40" style="opacity:${opacity}">
    <path d="M16 2C9.37 2 4 7.37 4 14c0 9.25 12 24 12 24S28 23.25 28 14C28 7.37 22.63 2 16 2z"
      fill="${fill}" stroke="#fff" stroke-width="2"/>
    ${symbol}
  </svg>`;
}

export function getPoiIcon(poi: TouristPoi, state: MarkerState): L.DivIcon {
  const { fill, size: [w, h], opacity } = STATE_COLORS[state];
  const symbol = pickSymbol(poi.shopTags, poi.hasApprovedAudio === true);
  const svg = buildSvg(fill, symbol, w, h, opacity);
  return L.divIcon({
    html: `<div style="width:${w}px;height:${h}px">${svg}</div>`,
    className: "",
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  });
}
