"use client";

import { useEffect, useState } from "react";
import { getMyShops, ShopResponse } from "@/modules/shop/services/shopApi";

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
      className="w-3.5 h-3.5">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
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

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop }: { shop: ShopResponse }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Name + status */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{shop.name}</h3>
        <StatusBadge status={shop.status} />
      </div>

      {/* Meta info */}
      <div className="space-y-1">
        {shop.cuisineStyle && (
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Phong cách:</span> {shop.cuisineStyle}
          </p>
        )}
        {shop.featuredDish && (
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Món nổi bật:</span> {shop.featuredDish}
          </p>
        )}
        {shop.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{shop.description}</p>
        )}
      </div>

      {/* POI link indicator */}
      <div className="pt-2 border-t border-gray-100">
        {shop.poiId ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <IconMapPin />
            Đã liên kết POI #{shop.poiId}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <IconMapPin />
            Chưa có vị trí POI
          </span>
        )}
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/3 mt-2" />
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
