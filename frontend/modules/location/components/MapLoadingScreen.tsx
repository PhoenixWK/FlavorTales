"use client";

/**
 * Full-screen animated loading screen shown before the map is ready.
 * Used both for session initialisation and for lazy-loading the Leaflet bundle.
 *
 * Intentionally does NOT use useTranslation to avoid SSR/client hydration
 * mismatch (locale is only hydrated from localStorage after mount).
 */
export default function MapLoadingScreen() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
      {/* Pin icon with pulse rings */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer pulse ring */}
        <span className="absolute h-24 w-24 rounded-full bg-orange-100 animate-ping opacity-50" />
        {/* Middle ring */}
        <span className="absolute h-16 w-16 rounded-full bg-orange-200 animate-pulse" />
        {/* Icon container */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.003 3.5-4.697 3.5-8.327a8 8 0 10-16 0c0 3.63 1.556 6.326 3.5 8.327a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* App name + message */}
      <div className="ft-fade-in-up text-center space-y-2 mb-10">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">FlavorTales</h1>
        <p className="text-sm text-gray-400">Đang khởi động…</p>
      </div>

      {/* Indeterminate progress bar */}
      <div className="w-48 sm:w-64 h-1 rounded-full bg-orange-100 overflow-hidden">
        <div className="h-full rounded-full bg-orange-500 ft-progress-bar" />
      </div>
    </div>
  );
}
