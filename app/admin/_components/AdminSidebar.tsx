"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconAllStalls,
  IconPendingReviews,
  IconQrCode,
  IconLogout,
  IconClose,
} from "./AdminIcons";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: boolean;
}

// ── Nav config ────────────────────────────────────────────────────────────────

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard",        label: "Dashboard",       icon: <IconDashboard /> },
  { href: "/admin/food-stalls",      label: "All Food Stalls", icon: <IconAllStalls />,      matchPrefix: true },
  { href: "/admin/pending-reviews",  label: "Pending Reviews", icon: <IconPendingReviews />, matchPrefix: true },
  { href: "/admin/qr-code",          label: "QR Code",         icon: <IconQrCode /> },
];

// ── SideNavItem ───────────────────────────────────────────────────────────────

function SideNavItem({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-orange-500 text-white shadow-sm"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

// ── AdminSidebar ──────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ onLogout, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 md:w-56 bg-white border-r border-gray-100 flex flex-col z-40 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm leading-tight">
              FoodMap Admin
            </span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href;
            return (
              <SideNavItem
                key={item.href}
                item={item}
                active={active}
                onClick={onClose}
              />
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition"
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
