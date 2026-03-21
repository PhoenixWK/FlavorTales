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

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}>
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

interface Props {
  onRefresh: () => void;
  loading: boolean;
}

export default function PoiListHeader({ onRefresh, loading }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">POI Management</h2>
        <p className="text-sm text-gray-600 mt-0.5">
          Manage your Points of Interest on the map
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Làm mới danh sách"
          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200
            bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 active:scale-[.98]
            transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconRefresh spinning={loading} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
        <Link
          href="/vendor/poi/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[.98] transition whitespace-nowrap"
        >
          <IconPlus />
          Add New POI
        </Link>
      </div>
    </div>
  );
}
