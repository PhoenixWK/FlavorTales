import type { Metadata } from "next";
import Link from "next/link";
import CreatePoiForm from "@/modules/poi/components/create/CreatePoiForm";

export const metadata: Metadata = {
  title: "Tạo POI & Gian hàng – FlavorTales",
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
        Quay lại Quản lý POI
      </Link>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Tạo POI &amp; Gian hàng mới</h2>
        <p className="text-sm text-gray-500 mt-1">
          Hoàn thành 3 bước để đăng ký vị trí và hồ sơ gian hàng của bạn. Sau khi gửi, hệ thống sẽ chờ admin duyệt.
        </p>
      </div>
      <CreatePoiForm />
    </main>
  );
}
