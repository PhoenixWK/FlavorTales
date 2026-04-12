import type { ReactElement } from "react";

/**
 * Category icon components for tourist POI UI.
 * Tag-to-icon mapping mirrors `PoiMarkerIconRenderer.ts`; tag-to-colour mapping is in `constants/poiCategoryColors.ts`.
 */

interface IconProps { className?: string }

function SeafoodIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12c2-4 7-4 10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <path d="M15 12c.6.8 1 1.7 1 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LeafIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c0 0-7 3-7 9s7 4 7 0c0 4 7 4 7 0S12 3 12 3z" fill="currentColor" fillOpacity={0.9} />
    </svg>
  );
}

function BowlIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 11h12M7 11c0 4 10 4 10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="7" x2="12" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ForkIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="9.5" y1="6" x2="9.5" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14.5" y1="6" x2="14.5" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 11h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function StarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        points="12,4 13.8,9.5 19.5,9.5 14.8,12.8 16.5,18.5 12,15.2 7.5,18.5 9.2,12.8 4.5,9.5 10.2,9.5"
        fill="currentColor" fillOpacity={0.9}
      />
    </svg>
  );
}

// ── Tag → icon mapping (same rules as poiIconFactory.ts) ─────────────────────

type IconComponent = (props: IconProps) => ReactElement;

function pickIcon(tag: string): IconComponent {
  if (tag.includes("Hải sản"))    return SeafoodIcon;
  if (tag.includes("Chay"))       return LeafIcon;
  if (tag.includes("Gia truyền")) return BowlIcon;
  if (tag === "Bình dân")         return ForkIcon;
  if (tag.includes("Đặc sản"))   return StarIcon;
  return ForkIcon;
}

// ── Exports ───────────────────────────────────────────────────────────────────

interface Props {
  tags?: string[] | null;
  className?: string;
}

/** SVG icon for the primary shop tag. */
export function ShopCategoryIcon({ tags, className = "h-5 w-5" }: Props) {
  const Icon = tags && tags.length > 0 ? pickIcon(tags[0]) : ForkIcon;
  return <Icon className={className} />;
}

/** Colored circular badge with the category icon — used in the detail panel. */
export function ShopCategoryBadge({ tags }: { tags?: string[] | null }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white shrink-0">
      <ShopCategoryIcon tags={tags} className="h-4 w-4" />
    </span>
  );
}
