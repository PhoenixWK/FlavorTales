"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  name: string;
  onImageClick: (index: number) => void;
}

/**
 * Horizontal scroll-snap carousel for POI images.
 * - Desktop (sm+): prev/next arrow buttons.
 * - Mobile: native touch swipe via CSS scroll-snap.
 * - Dot indicators shown when multiple images.
 * - Each image is clickable to open a lightbox.
 */
export default function PoiImageCarousel({ images, name, onImageClick }: Props) {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollTo({ left: index * c.offsetWidth, behavior: "smooth" });
    setCurrentIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const c = scrollRef.current;
    if (!c) return;
    setCurrentIndex(Math.round(c.scrollLeft / c.offsetWidth));
  }, []);

  return (
    <div className="relative w-full h-52 bg-gray-100 shrink-0 overflow-hidden">
      {/* Slides */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div
            key={i}
            onClick={() => onImageClick(i)}
            className="snap-start shrink-0 w-full h-full relative cursor-pointer"
          >
            <Image
              src={src}
              alt={`${name} - ảnh ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Desktop arrows + dot indicators (only when multiple images) */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={() => scrollTo(currentIndex - 1)}
              aria-label="Ảnh trước"
              className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/80 shadow hover:bg-white transition-colors"
            >
              <svg className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {currentIndex < images.length - 1 && (
            <button
              onClick={() => scrollTo(currentIndex + 1)}
              aria-label="Ảnh tiếp"
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/80 shadow hover:bg-white transition-colors"
            >
              <svg className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
