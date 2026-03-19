"use client";

import { useState } from "react";
import Link from "next/link";
import { PoiResponse } from "@/modules/poi/services/poiApi";
import { proxyFileUrl } from "@/shared/utils/mediaProxy";
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

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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
  const s = status.toLowerCase();
  const styles =
    s === "active"
      ? { bg: "bg-emerald-500/90", dot: "bg-white" }
      : s === "pending"
      ? { bg: "bg-amber-400/90", dot: "bg-white" }
      : { bg: "bg-gray-500/80", dot: "bg-gray-300" };

  const label = s === "active" ? "Active" : s === "pending" ? "Pending Review" : "Inactive";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm ${styles.bg} text-white`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      {label}
    </span>
  );
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

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

// ── Cover Image ───────────────────────────────────────────────────────────────

function CoverImage({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const proxied = proxyFileUrl(avatarUrl);
  const showImage = !!proxied && !failed;

  return (
    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied}
          alt={name}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-orange-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs font-medium">No cover image</span>
        </div>
      )}
      {/* subtle bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
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

  const isPending = poi.status.toLowerCase() === "pending";

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

      <div className="group bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

        {/* ── Cover Image ── */}
        <div className="relative">
          <CoverImage avatarUrl={poi.linkedShopAvatarUrl} name={poi.linkedShopName ?? poi.name} />
          {/* status — top left */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <StatusBadge status={poi.status} />
          </div>
          {/* kebab — top right */}
          <div className="absolute top-2 right-2 z-10">
            <KebabMenu name={poi.name} onDeleteClick={() => setShowDeleteDialog(true)} />
          </div>
          {/* POI name badge — bottom left over gradient */}
          <div className="absolute bottom-2.5 left-3 right-3 z-10">
            <p className="text-white font-bold text-[15px] leading-snug line-clamp-1 drop-shadow-sm">
              {poi.linkedShopName ?? poi.name}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-3">

          {/* Address row */}
          <div className="flex items-start gap-2">
            <IconMapPin className="w-3.5 h-3.5 shrink-0 text-orange-400 mt-0.5" />
            <span className="text-xs text-gray-600 leading-snug line-clamp-2">
              {poi.name}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Coordinate + Radius chips */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5">
              <IconCrosshair className="w-3.5 h-3.5 shrink-0 text-orange-500" />
              <span className="font-mono text-xs text-orange-900 truncate leading-none">
                {poi.latitude.toFixed(5)},&nbsp;{poi.longitude.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5">
              <IconBroadcast className="w-3.5 h-3.5 shrink-0 text-orange-500" />
              <span className="text-xs text-orange-900 leading-none">
                {poi.radius} m radius
              </span>
            </div>
          </div>

          {/* ── Action footer ── */}
          <div className="flex gap-2 pt-1 mt-auto">
            {isPending ? (
              <Link
                href={`/vendor/poi/${poi.poiId}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-semibold py-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                View Submission
              </Link>
            ) : (
              <Link
                href={`/vendor/poi/${poi.poiId}/edit`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 transition-colors"
              >
                <IconPencil className="w-3.5 h-3.5" />
                Edit
              </Link>
            )}
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

