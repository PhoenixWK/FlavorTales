"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyShops, ShopResponse, OpeningHourEntry } from "@/modules/shop/services/shopApi";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-gray-400">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconShopEmpty() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="w-12 h-12 text-orange-300">
      <path d="M3 9l1-6h16l1 6" />
      <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5 9v12h14V9" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5 shrink-0">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5 shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconDotsVertical() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="w-5 h-5">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's opening hours entry (0=Mon…6=Sun backend, 0=Sun JS) */
function getTodayHours(hours: OpeningHourEntry[] | null): OpeningHourEntry | null {
  if (!hours || hours.length === 0) return null;
  // JS getDay(): 0=Sun,1=Mon…6=Sat → backend day: 0=Mon…6=Sun
  const jsDay = new Date().getDay();
  const backendDay = jsDay === 0 ? 6 : jsDay - 1;
  return hours.find((h) => h.day === backendDay && !h.closed) ?? null;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  pending:  "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  disabled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  active:   "Hoạt động",
  pending:  "Chờ duyệt",
  rejected: "Từ chối",
  disabled: "Vô hiệu",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

function KebabMenu({ shopId }: { shopId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
        aria-label="More options"
      >
        <IconDotsVertical />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 text-sm">
            <Link
              href={`/vendor/shop/${shopId}/edit`}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Chỉnh sửa
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ── Cover image placeholder ───────────────────────────────────────────────────

function CoverPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50 text-orange-300 gap-2">
      <IconShopEmpty />
      <span className="text-xs text-orange-300">Chưa có ảnh</span>
    </div>
  );
}

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop }: { shop: ShopResponse }) {
  const todayHours = getTodayHours(shop.openingHours);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">

      {/* ── Cover photo ── */}
      <div className="relative h-44 w-full bg-gray-100">
        {shop.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.avatarUrl}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <CoverPlaceholder />
        )}
        {/* Status chip — top right of photo */}
        <div className="absolute top-2.5 right-2.5">
          <StatusBadge status={shop.status} />
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2.5 flex-1">

        {/* Name + kebab */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 flex-1">
            {shop.name}
          </h3>
          <KebabMenu shopId={shop.shopId} />
        </div>

        {/* Category chip */}
        {shop.cuisineStyle && (
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {shop.cuisineStyle}
            </span>
          </div>
        )}

        {/* Location + Hours */}
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          {shop.poiName ? (
            <span className="flex items-center gap-1 text-gray-600">
              <IconMapPin />
              {shop.poiName}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <IconMapPin />
              Chưa có vị trí
            </span>
          )}

          {todayHours ? (
            <span className="flex items-center gap-1 text-gray-600">
              <IconClock />
              {todayHours.open} - {todayHours.close}
            </span>
          ) : shop.openingHours && shop.openingHours.length > 0 ? (
            <span className="flex items-center gap-1 text-gray-400">
              <IconClock />
              Hôm nay nghỉ
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="px-4 pt-3 pb-4 space-y-2.5">
        <div className="flex justify-between items-start gap-2">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-5 w-5 bg-gray-100 rounded-full" />
        </div>
        <div className="h-5 bg-gray-100 rounded-full w-16" />
        <div className="flex gap-3">
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <IconShopEmpty />
      <h3 className="mt-4 text-base font-semibold text-gray-700">
        {isFiltered ? "Không tìm thấy gian hàng phù hợp" : "Chưa có gian hàng nào"}
      </h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">
        {isFiltered
          ? "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm."
          : "Liên hệ quản trị viên để đăng ký gian hàng của bạn."}
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none"
          stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm text-gray-600 font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-orange-500 border border-orange-200 hover:bg-orange-50 transition"
      >
        Thử lại
      </button>
    </div>
  );
}

// ── Shop List Page ────────────────────────────────────────────────────────────

export default function ShopListPage() {
  const [shops, setShops] = useState<ShopResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchShops = () => {
    setLoading(true);
    setError(null);
    getMyShops()
      .then((res) => {
        if (!res.success) throw new Error(res.message);
        setShops(res.data ?? []);
      })
      .catch((err: Error) => setError(err.message ?? "Không thể tải danh sách gian hàng."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const filtered = shops.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isFiltered = search.trim() !== "" || statusFilter !== "all";

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý gian hàng</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Xem và theo dõi trạng thái các gian hàng của bạn
          </p>
        </div>
        <Link
          href="/vendor/shop/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500
            text-white text-sm font-medium hover:bg-orange-600 transition shrink-0"
        >
          <span className="text-base leading-none">+</span>
          Tạo hồ sơ gian hàng
        </Link>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm gian hàng..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <IconFilter />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="pending">Chờ duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="disabled">Vô hiệu</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchShops} />
      ) : filtered.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4">
            {filtered.length} gian hàng
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((shop) => (
              <ShopCard key={shop.shopId} shop={shop} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
