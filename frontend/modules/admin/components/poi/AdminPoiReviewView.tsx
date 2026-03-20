import Link from "next/link";
import {
  type AdminShopDetail,
} from "@/modules/admin/services/adminShopApi";
import PoiDetailView from "@/modules/poi/components/view/PoiDetailView";
import type { PoiResponse } from "@/modules/poi/services/poiApi";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import AdminPoiActionBar from "./AdminPoiActionBar";

interface Props {
  shop: AdminShopDetail;
}

/** Maps AdminShopDetail to the shape expected by PoiDetailView's poi prop. */
function toPoiProps(shop: AdminShopDetail): PoiResponse {
  return {
    poiId: shop.poiId ?? 0,
    name: shop.poiName ?? "",
    latitude: shop.latitude ?? 0,
    longitude: shop.longitude ?? 0,
    radius: shop.radius ?? 50,
    status: shop.status,
    linkedShopId: shop.shopId,
    linkedShopName: shop.name,
    linkedShopAvatarUrl: shop.avatarUrl,
    createdAt: shop.createdAt,
    updatedAt: shop.createdAt,
  };
}

/** Maps AdminShopDetail to the shape expected by PoiDetailView's shop prop. */
function toShopProps(shop: AdminShopDetail): ShopDetail {
  return {
    shopId: shop.shopId,
    name: shop.name,
    description: shop.description,
    cuisineStyle: shop.cuisineStyle,
    featuredDish: shop.featuredDish,
    status: "pending",
    poiId: shop.poiId,
    poiName: shop.poiName,
    avatarUrl: shop.avatarUrl,
    // PoiViewInfoSection handles both string and number day values at runtime
    openingHours: shop.openingHours as ShopDetail["openingHours"],
    tags: shop.tags,
    createdAt: shop.createdAt,
    updatedAt: null,
    galleryUrls: shop.galleryUrls,
    viAudioUrl: shop.viAudioUrl,
    enAudioUrl: shop.enAudioUrl,
  };
}

export default function AdminPoiReviewView({ shop }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-1.5 pt-2">
        <Link href="/admin/pending-reviews" className="hover:text-orange-500 transition">
          Food stall management
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{shop.name}</span>
      </nav>

      {/* Vendor metadata */}
      <p className="text-xs text-gray-400">
        Submitted by{" "}
        <span className="font-medium text-gray-600">{shop.vendorEmail}</span>
        {" · "}
        {new Date(shop.createdAt).toLocaleDateString()}
      </p>

      {/* Full POI detail — reuses vendor view */}
      <PoiDetailView poi={toPoiProps(shop)} shop={toShopProps(shop)} />

      <AdminPoiActionBar shopId={shop.shopId} shopName={shop.name} />
    </div>
  );
}
