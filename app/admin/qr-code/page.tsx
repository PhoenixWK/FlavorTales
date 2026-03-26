import { AppQrCode } from "@/modules/admin/components/AppQrCode";

export default function AdminQrCodePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mã QR truy cập ứng dụng</h2>
        <p className="mt-1 text-sm text-gray-500">
          In mã QR và đặt tại các điểm tham quan. Khách du lịch quét mã để vào thẳng ứng dụng.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex justify-center">
        <AppQrCode />
      </div>
    </div>
  );
}
