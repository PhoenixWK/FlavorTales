"use client";

import type { AdminShopDetail, OpeningHourSlot } from "@/modules/admin/services/adminShopApi";

interface StallDetailLocationContactProps {
  shop: Pick<AdminShopDetail, "poiName" | "openingHours">;
  websiteUrl?: string | null;
}

function OpeningHoursTable({ slots }: { slots: OpeningHourSlot[] }) {
  return (
    <ul className="space-y-1 text-sm text-gray-600">
      {slots.map((slot, i) => (
        <li key={i} className="flex justify-between max-w-xs">
          <span className="font-medium capitalize">{slot.day}</span>
          <span>{slot.closed ? "Closed" : `${slot.open} – ${slot.close}`}</span>
        </li>
      ))}
    </ul>
  );
}

export default function StallDetailLocationContact({ shop, websiteUrl }: StallDetailLocationContactProps) {
  const address = shop.poiName ?? "Location not specified";
  const hours = shop.openingHours ?? [];

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Location &amp; Contact</h3>
      </div>
      <div className="p-6 space-y-5">
        {/* Address */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Stall Address / Zone</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4 text-orange-500 shrink-0">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm text-gray-800">{address}</span>
          </div>
        </div>

        {/* Map placeholder */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Map Location</p>
          <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
              <span className="text-xs">Map preview</span>
            </div>
            <a
              href="#"
              className="absolute bottom-2 right-2 bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow flex items-center gap-1 hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View on Map
            </a>
          </div>
        </div>

        {/* Opening hours */}
        {hours.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Opening Hours</p>
            <OpeningHoursTable slots={hours} />
          </div>
        )}

        {/* Website */}
        {websiteUrl && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Website Link</p>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-500 hover:underline break-all"
            >
              {websiteUrl}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
