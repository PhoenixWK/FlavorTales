import type { PoiResponse } from "@/modules/poi/services/poiApi";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import PoiViewCoverSection from "./PoiViewCoverSection";
import PoiViewInfoSection from "./PoiViewInfoSection";
import PoiViewGallerySection from "./PoiViewGallerySection";
import PoiViewAudioSection from "./PoiViewAudioSection";
import PoiViewLocationSection from "./PoiViewLocationSection";

interface Props {
  poi: PoiResponse;
  shop: ShopDetail;
}

/** A section header + content block inside a card. */
function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-linear-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <h3 className="text-sm font-semibold text-orange-700">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

/** Read-only detail view for a vendor's POI — single unified card, full width. */
export default function PoiDetailView({ poi, shop }: Props) {
  const isPending = poi.status.toLowerCase() === "pending";

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden divide-y divide-gray-100">
      {/* Pending review banner */}
      {isPending && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-4 flex gap-3">
          <div className="shrink-0 mt-0.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-amber-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Under Review</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your POI is currently being reviewed by our team. You can view your
              submission below but cannot make changes until review is complete.
            </p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <ViewSection title="Basic Information">
        <PoiViewCoverSection
          avatarUrl={shop.avatarUrl}
          name={shop.name}
        />
      </ViewSection>

      {/* Description & Media */}
      <ViewSection title="Description & Media">
        <div className="space-y-5">
          <PoiViewInfoSection
            description={shop.description}
            featuredDish={shop.featuredDish}
            openingHours={shop.openingHours}
            tags={shop.tags}
          />
          <PoiViewGallerySection galleryUrls={shop.galleryUrls} name={shop.name} />
        </div>
      </ViewSection>

      {/* Audio Narration */}
      <ViewSection title="Audio Narration">
        <PoiViewAudioSection
          viAudioUrl={shop.viAudioUrl}
          enAudioUrl={shop.enAudioUrl}
        />
      </ViewSection>

      {/* Location & Contact */}
      <ViewSection title="Location & Contact">
        <PoiViewLocationSection
          lat={poi.latitude}
          lng={poi.longitude}
          name={poi.name}
          radius={poi.radius}
        />
      </ViewSection>
    </div>
  );
}
