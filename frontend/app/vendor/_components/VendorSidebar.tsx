"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconAnalytics,
  IconMapPin,
  IconReviews,
  IconSettings,
  IconShop,
  IconLogout,
  IconClose,
} from "./VendorIcons";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: boolean;
}

// ── Nav items config ──────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { href: "/vendor/dashboard", label: "Dashboard",          icon: <IconDashboard /> },
  { href: "/vendor/poi",       label: "Quản lý POI",        icon: <IconMapPin />,    matchPrefix: true },
  { href: "/vendor/shop",      label: "Quản lý gian hàng",  icon: <IconShop />,      matchPrefix: true },
  { href: "/vendor/analytics", label: "Analytics",          icon: <IconAnalytics />, matchPrefix: true },
  { href: "/vendor/reviews",   label: "Reviews",            icon: <IconReviews />,   matchPrefix: true },
  { href: "/vendor/settings",  label: "Settings",           icon: <IconSettings />,  matchPrefix: true },
];

// ── SideNavItem ───────────────────────────────────────────────────────────────

function SideNavItem({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
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

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorSidebar({ onLogout, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay backdrop */}
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
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-base font-bold select-none">
              🍜
            </div>
            <span className="font-bold text-gray-900 text-sm leading-tight">FlavorTales</span>
          </div>
          {/* Close button — mobile only */}
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
          {NAV_ITEMS.map((item) => {
            const active = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href;
            return <SideNavItem key={item.href} item={item} active={active} onClick={onClose} />;
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
