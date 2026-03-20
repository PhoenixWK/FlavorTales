import type { ShopDetail } from "@/modules/shop/services/shopApi";
import FormSection from "@/modules/poi/components/create/FormSection";
import PoiViewCoverSection from "@/modules/poi/components/view/PoiViewCoverSection";
import PoiViewInfoSection from "@/modules/poi/components/view/PoiViewInfoSection";
import PoiViewGallerySection from "@/modules/poi/components/view/PoiViewGallerySection";
import PoiViewAudioSection from "@/modules/poi/components/view/PoiViewAudioSection";

interface Props {
  shop: ShopDetail;
}

function IconInfo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * Read-only preview of the linked shop, shown in the edit-POI page for context.
 * Reuses existing view sub-components — no edit capability here.
 */
export default function EditPoiShopPreview({ shop }: Props) {
  return (
    <div className="space-y-5">
      {/* Divider + label */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-700">
        <IconInfo />
        <span>
          Thông tin gian hàng liên kết — chỉ xem, không thể chỉnh sửa tại đây.
        </span>
      </div>

      <FormSection title="Gian hàng liên kết">
        <PoiViewCoverSection avatarUrl={shop.avatarUrl} name={shop.name} />
      </FormSection>

      <FormSection title="Mô tả & Hình ảnh">
        <div className="space-y-5">
          <PoiViewInfoSection
            description={shop.description}
            featuredDish={shop.featuredDish}
            openingHours={shop.openingHours}
            tags={shop.tags}
          />
          <PoiViewGallerySection galleryUrls={shop.galleryUrls} name={shop.name} />
        </div>
      </FormSection>

      <FormSection title="Âm thanh thuyết minh">
        <PoiViewAudioSection viAudioUrl={shop.viAudioUrl} enAudioUrl={shop.enAudioUrl} />
      </FormSection>
    </div>
  );
}
