"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession, VendorSession } from "@/shared/utils/auth";
import { useActiveVisitors } from "@/modules/analytics/hooks/useActiveVisitors";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type OrderStatus = "Preparing" | "Ready" | "Completed";

interface RecentOrder {
  id: number;
  name: string;
  minsAgo: number;
  type: "Takeaway" | "Dine-in";
  status: OrderStatus;
  icon: string;
}

// â”€â”€ Demo data (replace with real API calls) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEMO_ORDERS: RecentOrder[] = [
  { id: 1024, name: "Caramel Macchiato", minsAgo: 2,  type: "Takeaway", status: "Preparing", icon: "â˜•" },
  { id: 1023, name: "Chicken Panini",    minsAgo: 15, type: "Dine-in",  status: "Ready",     icon: "ðŸ¥ª" },
  { id: 1022, name: "Pepperoni Slice",   minsAgo: 24, type: "Takeaway", status: "Completed", icon: "ðŸ•" },
];

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub: React.ReactNode;
  loading?: boolean;
}

function StatCard({ label, value, icon, sub, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <span className="text-gray-300">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse mb-2" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      )}
      <div className="text-xs">{sub}</div>
    </div>
  );
}

// â”€â”€ Order Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function OrderBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    Preparing: "border border-orange-300 text-orange-500 bg-orange-50",
    Ready:     "border border-blue-300 text-blue-500 bg-blue-50",
    Completed: "border border-gray-200 text-gray-400 bg-gray-50",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// â”€â”€ Order Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function OrderRow({ order }: { order: RecentOrder }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0 select-none">
        {order.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          Order #{order.id} â€“ {order.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {order.minsAgo} min{order.minsAgo !== 1 ? "s" : ""} ago &bull; {order.type}
        </p>
      </div>
      <OrderBadge status={order.status} />
    </div>
  );
}

// â”€â”€ Stall Status Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StallStatusPanel() {
  const [audioPlaying, setAudioPlaying] = useState(true);
  const activeVisitors = useActiveVisitors();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Stall Status</h2>

      {/* Open / Closed indicator */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-4 mb-5">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">Open for Business</p>
          <p className="text-xs text-green-600">Closes at 9:00 PM</p>
        </div>
      </div>

      {/* Narration Audio */}
      <div className="flex items-center justify-between py-3 border-b border-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-900">Narration Audio</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {audioPlaying ? "Playing: \"Our History\"" : "Paused"}
          </p>
        </div>
        <button
          onClick={() => setAudioPlaying((p) => !p)}
          className="w-9 h-9 rounded-full border-2 border-orange-400 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition flex-shrink-0"
          aria-label={audioPlaying ? "Pause audio" : "Play audio"}
        >
          {audioPlaying ? (
            /* pause icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-4 h-4">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            /* play icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-4 h-4 ml-0.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
      </div>

      {/* Occupancy / Real-time visitor count */}
      <div className="flex items-center justify-between pt-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Active Visitors</p>
          <p className="text-xs text-gray-400 mt-0.5">Real-time nearby tourists</p>
        </div>
        {activeVisitors === null ? (
          <div className="h-8 w-12 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{activeVisitors}</p>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

// â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function VendorDashboard() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Demo stats â€” replace with real API call
  const stats = { orders: 42, revenue: 384.5, menuItems: 18, rating: 4.8, reviews: 124 };

  useEffect(() => {
    setSession(getSession());
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">

      {/* â”€â”€ Greeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div>
        {session ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900">
              {greeting()}, {session.username}!
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Here&apos;s what&apos;s happening at your stall today.
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-56" />
          </>
        )}
      </div>

      {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders Today"
          value={loading ? "â€”" : stats.orders}
          loading={loading}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          }
          sub={
            <span className="flex items-center gap-1 text-green-500 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                className="w-3 h-3">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +12% from yesterday
            </span>
          }
        />
        <StatCard
          label="Total Revenue"
          value={loading ? "â€”" : `$${stats.revenue.toFixed(2)}`}
          loading={loading}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          sub={
            <span className="flex items-center gap-1 text-green-500 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                className="w-3 h-3">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +8% from yesterday
            </span>
          }
        />
        <StatCard
          label="Active Menu Items"
          value={loading ? "â€”" : stats.menuItems}
          loading={loading}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          sub={<span className="text-gray-400">All items available</span>}
        />
        <StatCard
          label="Average Rating"
          value={loading ? "â€”" : stats.rating.toFixed(1)}
          loading={loading}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          sub={
            <span className="flex items-center gap-1 text-green-500 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="w-3 h-3">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              Based on {stats.reviews} reviews
            </span>
          }
        />
      </div>

      {/* â”€â”€ Bottom split â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent Orders â€” 3/5 */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/vendor/orders" className="text-sm font-medium text-orange-500 hover:text-orange-600 transition">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4 mt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div>
              {DEMO_ORDERS.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* Stall Status â€” 2/5 */}
        <div className="lg:col-span-2">
          <StallStatusPanel />
        </div>
      </div>
    </div>
  );
}
