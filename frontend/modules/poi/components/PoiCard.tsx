"use client";

import { useState } from "react";
import Link from "next/link";
import { PoiResponse } from "@/modules/poi/services/poiApi";
import DeletePoiDialog from "./DeletePoiDialog";
import Toast from "@/shared/components/Toast";
import type { ToastData } from "@/shared/components/Toast";

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

/** Crosshair — GPS coordinates */
function IconCrosshair({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  );
}

/** Broadcast ripple — coverage radius */
function IconBroadcast({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 12.5a10 10 0 0 1 14 0" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === "active";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm ${
      isActive ? "bg-emerald-500/90 text-white" : "bg-gray-500/80 text-white"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-white" : "bg-gray-300"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ── Kebab menu (delete only — edit/view are in the action footer) ──────────────

function KebabMenu({ name, onDeleteClick }: { name: string; onDeleteClick: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg shadow-sm border border-white/60 transition"
        aria-label={`More options for ${name}`}
      >
        <IconDotsVertical />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
            <button
              onClick={() => { setOpen(false); onDeleteClick(); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition w-full text-left"
            >
              <IconTrash className="w-3.5 h-3.5" />
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
    <div className="relative h-40 overflow-hidden bg-orange-50">
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

export default function PoiCard({
  poi,
  onDeleted,
}: {
  poi: PoiResponse;
  onDeleted: () => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const handleDeleted = () => {
    setShowDeleteDialog(false);
    setToast({ type: "success", message: "POI deleted successfully." });
    onDeleted();
  };

  const handleError = (message: string) => {
    setToast({ type: "error", message });
  };

  return (
    <>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {showDeleteDialog && (
        <DeletePoiDialog
          poiId={poi.poiId}
          poiName={poi.name}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={handleDeleted}
          onError={handleError}
        />
      )}

      <div className="group bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col">

        {/* ── Map ── */}
        <div className="relative">
          <MapThumbnail lat={poi.latitude} lng={poi.longitude} name={poi.name} />
          {/* bottom gradient for readability */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          {/* status — top left */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <StatusBadge status={poi.status} />
          </div>
          {/* kebab — top right */}
          <div className="absolute top-2 right-2 z-10">
            <KebabMenu name={poi.name} onDeleteClick={() => setShowDeleteDialog(true)} />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-3">

          {/* Name */}
          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">
            {poi.name}
          </h3>

          {/* Coordinate + Radius chips */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5">
              <IconCrosshair className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" />
              <span className="font-mono text-xs text-orange-900 truncate leading-none">
                {poi.latitude.toFixed(5)},&nbsp;{poi.longitude.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5">
              <IconBroadcast className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" />
              <span className="text-xs text-orange-900 leading-none">
                {poi.radius} m radius
              </span>
            </div>
          </div>

          {/* ── Action footer ── */}
          <div className="flex gap-2 pt-1 mt-auto">
            <Link
              href={`/vendor/poi/${poi.poiId}/edit`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 transition-colors"
            >
              <IconPencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <a
              href={`https://www.openstreetmap.org/?mlat=${poi.latitude}&mlon=${poi.longitude}&zoom=18`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-xs font-semibold py-2 transition-colors"
            >
              <IconExternalLink className="w-3.5 h-3.5" />
              View Map
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
