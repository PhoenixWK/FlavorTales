import Link from "next/link";

function IconPlus() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function PoiListHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">POI Management</h2>
        <p className="text-sm text-gray-600 mt-0.5">
          Manage your Points of Interest on the map
        </p>
      </div>
      <Link
        href="/vendor/poi/create"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[.98] transition whitespace-nowrap self-start sm:self-auto"
      >
        <IconPlus />
        Add New POI
      </Link>
    </div>
  );
}
