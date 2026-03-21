"use client";

import { useState, useEffect } from "react";
import {
  fetchPendingShops,
  type AdminShopListItem,
} from "@/modules/admin/services/adminShopApi";
import AdminPoiCard from "./AdminPoiCard";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-gray-400">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={`w-4 h-4 transition-transform duration-500 ${spinning ? "animate-spin" : ""}`}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
      <div className="w-full aspect-video bg-gray-200" />
      <div className="px-3 py-2.5 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
            p === page
              ? "bg-orange-500 text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Main List Component ───────────────────────────────────────────────────────

const PAGE_SIZE = 9;

export default function AdminPoiList() {
  const [shops, setShops] = useState<AdminShopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const loadShops = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    fetchPendingShops()
      .then(setShops)
      .catch(() => setError("Failed to load pending stalls. Please try again."))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadShops();
  }, []);

  const filtered = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.cuisineStyle ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(1);
  };

  return (
    <div>
      {/* Search bar + Refresh */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative max-w-sm flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="Search pending stalls..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
          />
        </div>
        <button
          onClick={() => loadShops(true)}
          disabled={refreshing || loading}
          title="Làm mới danh sách"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-orange-500 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <IconRefresh spinning={refreshing} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-red-500 py-8 text-sm">{error}</p>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          {paginated.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {paginated.map((shop) => (
                <AdminPoiCard key={shop.shopId} shop={shop} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-16">No pending stalls found.</p>
          )}

          {/* Pagination */}
          <Pagination
            page={page}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
