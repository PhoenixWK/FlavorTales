"use client";

import StallDetailCoverImage from "./StallDetailCoverImage";
import type { AdminShopDetail } from "@/modules/admin/services/adminShopApi";

interface StallDetailBasicInfoProps {
  shop: Pick<AdminShopDetail, "name" | "cuisineStyle" | "featuredDish" | "vendorEmail" | "createdAt" | "avatarUrl">;
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-9">
        {value || <span className="text-gray-400">—</span>}
      </p>
    </div>
  );
}

export default function StallDetailBasicInfo({ shop }: StallDetailBasicInfoProps) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
      </div>
      <div className="p-6 space-y-5">
        <StallDetailCoverImage avatarUrl={shop.avatarUrl} name={shop.name} />
        <div className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="Stall Name" value={shop.name} />
          <ReadOnlyField label="Type of Stall" value={shop.cuisineStyle} />
        </div>
        <p className="text-xs text-gray-400">
          Submitted by{" "}
          <span className="font-medium text-gray-600">{shop.vendorEmail}</span>
          {" · "}
          {new Date(shop.createdAt).toLocaleDateString()}
        </p>
      </div>
    </section>
  );
}
