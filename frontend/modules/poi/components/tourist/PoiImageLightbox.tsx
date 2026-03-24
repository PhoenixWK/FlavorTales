"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Full-screen image lightbox.
 * - Keyboard: Escape to close, ArrowLeft/ArrowRight to navigate.
 * - Click backdrop to close.
 * - Prev/Next buttons, image counter.
 */
export default function PoiImageLightbox({ images, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goPrev = useCallback(() => setCurrentIndex(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setCurrentIndex(i => Math.min(images.length - 1, i + 1)), [images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      else if (e.key === "ArrowLeft")  goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  return (
    <div
      className="fixed inset-0 z-2000 bg-black/90"
      onClick={onClose}
    >
      {/* Image — stop propagation so clicking it doesn't close the lightbox */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-[90vw] h-[85vh]">
          <Image
            src={images[currentIndex]}
            alt={`Ảnh ${currentIndex + 1}`}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Đóng"
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm bg-black/50 rounded-full px-3 py-1 pointer-events-none">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev */}
      {currentIndex > 0 && (
        <button
          onClick={e => { e.stopPropagation(); goPrev(); }}
          aria-label="Ảnh trước"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); goNext(); }}
          aria-label="Ảnh tiếp"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
