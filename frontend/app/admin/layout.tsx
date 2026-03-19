"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/modules/auth/services/authApi";
import { getSession, clearSession, VendorSession } from "@/shared/utils/auth";
import { AdminSidebar } from "./_components/AdminSidebar";
import { AdminTopHeader } from "./_components/AdminTopHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<VendorSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") {
      router.replace(
        "/auth/admin/login?from=" +
          encodeURIComponent(window.location.pathname)
      );
    } else {
      setSession(s);
    }
    setChecking(false);
  }, [router]);

  const pathname = usePathname();
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    clearSession();
    router.replace("/auth/admin/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 min-h-screen md:pl-56">
        <AdminTopHeader
          session={session}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
