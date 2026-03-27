"use client";

import { useState } from "react";
import { resolveImgSrc } from "@/shared/utils/mediaProxy";

interface GalleryImageProps {
  src: string;
  alt: string;
}

function GalleryImage({ src, alt }: GalleryImageProps) {
  const [failed, setFailed] = useState(false);
  const proxiedSrc = resolveImgSrc(src);

  if (failed || !proxiedSrc) {
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
        src={proxiedSrc}
        alt={alt}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

interface Props {
  galleryUrls: string[] | null;
  name: string;
}

export default function PoiViewGallerySection({ galleryUrls, name }: Props) {
  const urls = galleryUrls ?? [];

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Gallery Images</p>
      {urls.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {urls.map((src, idx) => (
            <GalleryImage key={idx} src={src} alt={`${name} photo ${idx + 1}`} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-400">No gallery images</span>
        </div>
      )}
    </div>
  );
}
