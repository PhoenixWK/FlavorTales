"use client";

/**
 * Shown inside TouristMap when the user has denied location access.
 * Prompts them to re-enable GPS without blocking the map.
 * Responsive: fixed bottom on mobile, bottom-left on desktop.
 */
export default function GpsDeniedBanner() {
  return (
    <div
      role="alert"
      className="
        fixed z-1000
        bottom-0 left-0 right-0
        sm:bottom-6 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl
        bg-amber-500 text-white
        px-4 py-3
        flex items-start gap-3 shadow-lg
      "
    >
      {/* Icon */}
      <svg
        className="h-5 w-5 shrink-0 mt-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">GPS bị từ chối</p>
        <p className="text-xs mt-0.5 opacity-90 leading-snug">
          Để hiển thị vị trí của bạn, hãy cho phép truy cập vị trí trong cài đặt trình duyệt.
        </p>
      </div>

      {/* Action link */}
      <a
        href="https://support.google.com/chrome/answer/142065"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 self-center text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-100 whitespace-nowrap"
      >
        Hướng dẫn
      </a>
    </div>
  );
}
