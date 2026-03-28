"use client";

import { useRef } from "react";

/** Size of the draggable button in px — shared with AudioPlayerBar for panel positioning. */
export const MINI_BUTTON_SIZE = 56;
const MARGIN = 12;

interface Props {
  pos: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  /** Whether the expanded player panel is currently visible. */
  expanded: boolean;
  onToggle: () => void;
  isPlaying: boolean;
}

/**
 * Draggable fixed-position icon button for the audio player.
 * — Position and expanded/collapsed state are owned by AudioPlayerBar.
 * — Tap (< 4 px movement) → onToggle; drag → onPositionChange.
 * — Shows chevron-up when panel is open, headphones when closed.
 */
export default function AudioMiniButton({ pos, onPositionChange, expanded, onToggle, isPlaying }: Props) {
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const didDragRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    dragStartRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    didDragRef.current = false;
    btnRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.px;
    const dy = e.clientY - dragStartRef.current.py;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
    const newX = Math.max(MARGIN, Math.min(dragStartRef.current.ox + dx, window.innerWidth  - MINI_BUTTON_SIZE - MARGIN));
    const newY = Math.max(MARGIN, Math.min(dragStartRef.current.oy + dy, window.innerHeight - MINI_BUTTON_SIZE - MARGIN));
    onPositionChange({ x: newX, y: newY });
  }

  function onPointerUp() {
    if (!didDragRef.current) onToggle();
    dragStartRef.current = null;
    didDragRef.current = false;
  }

  return (
    <button
      ref={btnRef}
      aria-label={expanded ? "Thu gọn audio" : "Mở trình phát audio"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ left: pos.x, top: pos.y, width: MINI_BUTTON_SIZE, height: MINI_BUTTON_SIZE }}
      className="fixed z-1300 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 shadow-2xl transition-colors select-none touch-none cursor-grab active:cursor-grabbing"
    >
      <span className="relative flex items-center justify-center w-full h-full">
        {/* Pulsing ring only when playing and panel is hidden */}
        {isPlaying && !expanded && (
          <span className="absolute inset-0 rounded-full border-2 border-orange-300 animate-ping opacity-75" />
        )}
        {expanded ? (
          /* Chevron-up: tap to collapse */
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z" />
          </svg>
        ) : (
          /* Headphones: tap to expand */
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3a9 9 0 0 0-9 9v5a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H5v-2a7 7 0 0 1 14 0v2h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a3 3 0 0 0 3-3v-5a9 9 0 0 0-9-9z" />
          </svg>
        )}
      </span>
    </button>
  );
}
