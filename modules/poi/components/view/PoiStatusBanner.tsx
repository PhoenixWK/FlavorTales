function IconCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-emerald-500"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-amber-500"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

interface Props {
  status: string;
}

export default function PoiStatusBanner({ status }: Props) {
  const normalized = status.toLowerCase();

  if (normalized === "active") {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <IconCheck />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">POI đang hoạt động</p>
          <p className="text-sm text-emerald-700 mt-0.5">
            POI của bạn đang hoạt động và hiển thị với người dùng. Bấm{" "}
            <span className="font-medium">Edit POI</span> nếu bạn muốn chỉnh sửa thông tin.
          </p>
        </div>
      </div>
    );
  }

  if (normalized === "pending") {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <IconInfo />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">Under Review</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Your POI is currently being reviewed by our team. You can view your
            submission below but cannot make changes until review is complete.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
