"use client";

import { useState } from "react";
import Link from "next/link";
import { PoiResponse } from "@/modules/poi/services/poiApi";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDotsVertical() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4">
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5 flex-shrink-0 text-amber-500">
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconRadius() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5 flex-shrink-0 text-amber-500">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="12" x2="19" y2="12" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
        isActive
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          isActive ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ── Card Menu ─────────────────────────────────────────────────────────────────

function CardMenu({ poiId, name }: { poiId: number; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
        aria-label={`Options for ${name}`}
      >
        <IconDotsVertical />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
            <a
              href={`https://www.openstreetmap.org/?mlat=${poiId}&zoom=18`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition w-full text-left"
              onClick={() => setOpen(false)}
            >
              <IconExternalLink />
              View on Map
            </a>
            <div className="my-1 border-t border-gray-100" />
            <button
              disabled
              title="Coming soon"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 cursor-not-allowed opacity-50 w-full text-left"
            >
              Delete POI
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Map Thumbnail ─────────────────────────────────────────────────────────────

function MapThumbnail({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const delta = 0.003;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="relative h-44 overflow-hidden bg-orange-50">
      <iframe
        title={`Map for ${name}`}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, pointerEvents: "none", marginTop: "-30px" }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// ── POI Card ──────────────────────────────────────────────────────────────────

export default function PoiCard({ poi }: { poi: PoiResponse }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* Map thumbnail */}
      <MapThumbnail lat={poi.latitude} lng={poi.longitude} name={poi.name} />

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Name + menu */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
            {poi.name}
          </h3>
          <CardMenu poiId={poi.poiId} name={poi.name} />
        </div>

        {/* Status */}
        <StatusBadge status={poi.status} />

        {/* Meta info */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <IconMapPin />
            <span className="font-mono truncate">
              {poi.latitude.toFixed(5)}, {poi.longitude.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <IconRadius />
            <span>{poi.radius} m radius</span>
          </div>
        </div>
      </div>
    </div>
  );
}
