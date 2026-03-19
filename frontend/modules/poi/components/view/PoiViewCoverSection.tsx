"use client";

import { useState } from "react";
import { proxyFileUrl } from "@/shared/utils/mediaProxy";

interface Props {
  avatarUrl: string | null;
  name: string;
}

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-10 h-10"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span className="text-xs">No cover image</span>
    </div>
  );
}

export default function PoiViewCoverSection({ avatarUrl, name }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const proxiedUrl = proxyFileUrl(avatarUrl);
  const showImage = !!proxiedUrl && !imgFailed;

  return (
    <div className="space-y-4">
      {/* Cover image */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Stall Cover Image</p>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxiedUrl}
              alt={name}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </div>
      </div>

      {/* Stall name — full width */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Stall Name</p>
        <p className="text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-9 text-center">
          {name || <span className="text-gray-400">—</span>}
        </p>
      </div>
    </div>
  );
}
