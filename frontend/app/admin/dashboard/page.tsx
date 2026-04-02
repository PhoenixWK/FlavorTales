"use client";

import LiveStatCard from "@/modules/analytics/components/LiveStatCard";
import { VisitorChart } from "@/modules/analytics/components/VisitorChart";
import { useActiveVisitors } from "@/modules/analytics/hooks/useActiveVisitors";
import { fetchPoiStats } from "@/modules/poi/services/poiAdminApi";
import { fetchActiveVendorCount } from "@/modules/user/services/userAdminApi";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconEye() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-6 h-6">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-6 h-6">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-6 h-6">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const activeVisitors = useActiveVisitors();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>

      {/* Live stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LiveStatCard
          label="Active Visitors"
          value={activeVisitors}
          icon={<IconEye />}
          color="bg-indigo-500"
        />
        <LiveStatCard
          label="Active Vendors"
          fetcher={fetchActiveVendorCount}
          pollIntervalMs={30_000}
          icon={<IconUsers />}
          color="bg-emerald-500"
        />
        <LiveStatCard
          label="Active POIs"
          fetcher={async () => {
            const data = await fetchPoiStats();
            return data.activePois;
          }}
          pollIntervalMs={60_000}
          icon={<IconMapPin />}
          color="bg-orange-500"
        />
      </div>

      {/* Visitor traffic chart */}
      <VisitorChart />
    </div>
  );
}

