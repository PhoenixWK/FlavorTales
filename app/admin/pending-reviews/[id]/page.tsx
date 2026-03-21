import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import AdminPoiReviewView from "@/modules/admin/components/poi/AdminPoiReviewView";
import type { AdminShopDetail } from "@/modules/admin/services/adminShopApi";

const INTERNAL_API = process.env.INTERNAL_API_BASE_URL ?? "http://localhost:8080";

async function getShopDetail(id: string): Promise<AdminShopDetail | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_access_token")?.value;
  if (!token) return null;

  const res = await fetch(`${INTERNAL_API}/api/shop/admin/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = await res.json();
  if (!json.success || !json.data) return null;

  const data = json.data;

  // Parse JSON string fields from backend (same as proxy route logic)
  if (typeof data.openingHours === "string") {
    try { data.openingHours = JSON.parse(data.openingHours); } catch { data.openingHours = null; }
  }
  if (typeof data.tags === "string") {
    try { data.tags = JSON.parse(data.tags); } catch { data.tags = null; }
  }

  return data as AdminShopDetail;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const shop = await getShopDetail(id);
  return {
    title: shop
      ? `${shop.name} – Pending Review | FlavorTales Admin`
      : "Not Found",
  };
}

export default async function PendingReviewDetailPage({ params }: Props) {
  const { id } = await params;
  const shop = await getShopDetail(id);
  if (!shop) notFound();

  return <AdminPoiReviewView shop={shop} />;
}
