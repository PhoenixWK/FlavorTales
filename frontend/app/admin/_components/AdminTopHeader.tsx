"use client";

import { usePathname } from "next/navigation";
import { type VendorSession } from "@/shared/utils/auth";
import { AdminAvatar, IconMenu } from "./AdminIcons";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";

// ── Page title derived from current route ─────────────────────────────────────

function usePageTitle(): string {
  const pathname = usePathname();
  const item = ADMIN_NAV_ITEMS.find((n) =>
    n.matchPrefix ? pathname.startsWith(n.href) : pathname === n.href
  );
  return item?.label ?? "Dashboard";
}

// ── AdminTopHeader ────────────────────────────────────────────────────────────

interface AdminTopHeaderProps {
  session: VendorSession;
  onMenuToggle: () => void;
}

export function AdminTopHeader({ session, onMenuToggle }: AdminTopHeaderProps) {
  const pageTitle = usePageTitle();

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
        <h1 className="text-base font-semibold text-gray-800 truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right: user info + avatar */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {session.username}
          </p>
          <p className="text-xs text-gray-400 leading-tight">Super Admin</p>
        </div>
        <AdminAvatar username={session.username} />
      </div>
    </header>
  );
}
