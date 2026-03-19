"use client";

import { useState } from "react";
import type { AdminShopDetail } from "@/modules/admin/services/adminShopApi";

interface StallDetailDescriptionMediaProps {
  shop: Pick<AdminShopDetail, "description" | "galleryUrls" | "name">;
}

function GalleryImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-gray-300">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default function StallDetailDescriptionMedia({ shop }: StallDetailDescriptionMediaProps) {
  const gallery = shop.galleryUrls ?? [];

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Description &amp; Media</h3>
      </div>
      <div className="p-6 space-y-5">
        {/* Description */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-20 leading-relaxed">
            {shop.description || <span className="text-gray-400">No description provided.</span>}
          </p>
        </div>
        {/* Gallery */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Gallery Images</p>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((src, idx) => (
                <GalleryImage key={idx} src={src} alt={`${shop.name} photo ${idx + 1}`} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-400">No gallery images</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
