"use client";

import { useState } from "react";

interface StallDetailCoverImageProps {
  avatarUrl: string | null;
  name: string;
}

export default function StallDetailCoverImage({ avatarUrl, name }: StallDetailCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!avatarUrl && !failed;

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">Stall Cover Image</p>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-xs">No cover image</span>
          </div>
        )}
      </div>
    </div>
  );
}
