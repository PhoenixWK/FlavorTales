import type { Metadata } from "next";
import Link from "next/link";
import CreatePoiForm from "@/modules/poi/components/CreatePoiForm";

export const metadata: Metadata = {
  title: "Create POI – FlavorTales",
};

export default function CreatePoiPage() {
  return (
    <main className="p-4 sm:p-6 md:p-8">
      {/* Back link */}
      <Link
        href="/vendor/poi"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to POI Management
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create New POI</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add a Point of Interest on the map to mark your food stall location.
        </p>
      </div>
      <CreatePoiForm />
    </main>
  );
}
