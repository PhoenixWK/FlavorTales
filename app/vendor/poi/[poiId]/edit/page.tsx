import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditPoiForm from "@/modules/poi/components/EditPoiForm";
import type { PoiResponse } from "@/modules/poi/services/poiApi";

export const metadata: Metadata = {
  title: "Edit POI – FlavorTales",
};

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

async function fetchPoi(poiId: string): Promise<PoiResponse | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/poi/${poiId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as PoiResponse;
  } catch {
    return null;
  }
}

export default async function EditPoiPage({
  params,
}: {
  params: Promise<{ poiId: string }>;
}) {
  const { poiId } = await params;
  const poi = await fetchPoi(poiId);

  if (!poi) notFound();

  return (
    <main className="p-4 sm:p-6 md:p-8">
      {/* Back link */}
      <Link
        href="/vendor/poi"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to POI Management
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Edit POI</h2>
        <p className="text-sm text-gray-500 mt-1">
          Update the details for{" "}
          <span className="font-medium text-gray-700">{poi.name}</span>.
          Fields marked with <span className="text-red-500">*</span> are required.
        </p>
      </div>

      <EditPoiForm initialPoi={poi} />
    </main>
  );
}
