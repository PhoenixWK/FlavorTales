/** Shows an info banner when the vendor edited the submission after initial creation. */

interface Props {
  createdAt: string;
  updatedAt: string | null;
}

/** Returns true if updatedAt is more than 60 seconds after createdAt. */
function wasEditedAfterCreation(createdAt: string, updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const diffMs = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return diffMs > 60_000;
}

function IconInfo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-blue-500 shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function AdminPoiUpdateBanner({ createdAt, updatedAt }: Props) {
  if (!wasEditedAfterCreation(createdAt, updatedAt)) return null;

  const updatedDate = new Date(updatedAt!).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <IconInfo />
      <p className="text-sm text-blue-800">
        <span className="font-semibold">Vendor đã cập nhật thông tin</span>
        {" "}vào lúc{" "}
        <span className="font-medium">{updatedDate}</span>
        {" "}— vui lòng kiểm tra kỹ các thông tin bên dưới trước khi phê duyệt.
      </p>
    </div>
  );
}
