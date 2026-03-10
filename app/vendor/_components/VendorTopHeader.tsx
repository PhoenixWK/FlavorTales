"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type VendorSession } from "@/shared/utils/auth";
import { Avatar, IconBell, IconMenu } from "./VendorIcons";
import { NAV_ITEMS } from "./VendorSidebar";

// ── Page title derived from current route ─────────────────────────────────────

function usePageTitle(): string {
  const pathname = usePathname();
  const item = NAV_ITEMS.find((n) =>
    n.matchPrefix ? pathname.startsWith(n.href) : pathname === n.href
  );
  return item?.label ?? "Dashboard";
}

// ── TopHeader ─────────────────────────────────────────────────────────────────

interface TopHeaderProps {
  session: VendorSession;
  onMenuToggle: () => void;
}

export function VendorTopHeader({ session, onMenuToggle }: TopHeaderProps) {
  const pageTitle = usePageTitle();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        <h1 className="text-base font-semibold text-gray-800 truncate">{pageTitle}</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Bell */}
        <button
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          aria-label="Notifications"
        >
          <IconBell />
        </button>

        {/* User info + avatar */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{session.username}</p>
              <p className="text-xs text-gray-400 leading-tight capitalize">{session.role}</p>
            </div>
            <Avatar username={session.username} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{session.username}</p>
                  <p className="text-xs text-gray-400 truncate">{session.email}</p>
                </div>
                <Link
                  href="/vendor/settings"
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
