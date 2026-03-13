"use client";

import { useEffect, useState } from "react";
import { getMyPois, PoiResponse } from "@/modules/poi/services/poiApi";
import PoiCard from "./PoiCard";
import PoiListHeader from "./PoiListHeader";
import PoiSearchBar from "./PoiSearchBar";
import PoiPagination from "./PoiPagination";
import { SkeletonCard, EmptyState, ErrorState } from "./PoiListStates";

const PAGE_SIZE = 6;

export default function PoiListPage() {
  const [pois, setPois]               = useState<PoiResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPois = () => {
    setLoading(true);
    setError(null);
    getMyPois()
      .then((res) => setPois(res.data ?? []))
      .catch((err: Error) => setError(err.message ?? "Failed to load POIs."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPois(); }, []);

  // Reset to page 1 whenever the filter/search changes
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const filtered = pois.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const isFiltered = search.trim() !== "" || statusFilter !== "all";

  return (
    <div>
      <PoiListHeader />

      <PoiSearchBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* â”€â”€ Content â”€â”€ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPois} />
      ) : filtered.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginated.map((poi) => (
              <PoiCard key={poi.poiId} poi={poi} onDeleted={fetchPois} />
            ))}
          </div>

          <PoiPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
