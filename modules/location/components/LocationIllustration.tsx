"use client";

/**
 * Decorative map + pin illustration for the location permission screen.
 * Kept in its own file so the parent component stays lean.
 */
export default function LocationIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-48 h-48 drop-shadow-xl"
      aria-hidden
    >
      {/* Base map */}
      <rect x="20" y="60" width="160" height="110" rx="12" fill="white" fillOpacity="0.25" />
      <rect x="20" y="60" width="160" height="110" rx="12" stroke="white" strokeWidth="2" strokeOpacity="0.5" />

      {/* Roads */}
      <line x1="20" y1="115" x2="180" y2="115" stroke="white" strokeWidth="3" strokeOpacity="0.5" />
      <line x1="100" y1="60" x2="100" y2="170" stroke="white" strokeWidth="3" strokeOpacity="0.5" />
      <path d="M 20 95 Q 60 80 100 95 Q 140 110 180 95" stroke="white" strokeWidth="2" strokeOpacity="0.35" fill="none" />

      {/* Main pin */}
      <ellipse cx="100" cy="175" rx="14" ry="4" fill="black" fillOpacity="0.2" />
      <path d="M100 40 C84 40 72 52 72 68 C72 88 100 115 100 115 C100 115 128 88 128 68 C128 52 116 40 100 40Z" fill="white" />
      <circle cx="100" cy="68" r="10" fill="#f97316" />

      {/* Secondary pins */}
      <path d="M58 78 C53 78 48 83 48 89 C48 97 58 108 58 108 C58 108 68 97 68 89 C68 83 63 78 58 78Z" fill="white" fillOpacity="0.75" />
      <circle cx="58" cy="89" r="6" fill="#fbbf24" />

      <path d="M148 92 C143 92 138 97 138 103 C138 111 148 122 148 122 C148 122 158 111 158 103 C158 97 153 92 148 92Z" fill="white" fillOpacity="0.75" />
      <circle cx="148" cy="103" r="6" fill="#fb923c" />
    </svg>
  );
}
