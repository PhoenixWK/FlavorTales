"use client";

import { useState } from "react";
import { deletePoi } from "@/modules/poi/services/poiApi";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconWarning() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-6 h-6 text-red-500 flex-shrink-0">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconX() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Step 1: Warning + checkbox ────────────────────────────────────────────────

function Step1({
  poiName,
  hardDelete,
  onHardDeleteChange,
  acknowledged,
  onAcknowledgedChange,
  onCancel,
  onNext,
}: {
  poiName: string;
  hardDelete: boolean;
  onHardDeleteChange: (v: boolean) => void;
  acknowledged: boolean;
  onAcknowledgedChange: (v: boolean) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <IconWarning />
        <div>
          <h2 className="text-base font-bold text-gray-950">CẢNH BÁO: Không thể hoàn tác</h2>
          <p className="text-sm text-gray-800 mt-1">
            Bạn đang xóa POI <span className="font-semibold text-gray-950">{poiName}</span>.
          </p>
        </div>
      </div>

      {/* Consequences */}
      <ul className="text-sm text-gray-800 space-y-1.5 mb-5 pl-1">
        <li className="flex gap-2"><span className="text-red-600 font-bold">•</span> POI bị xóa khỏi bản đồ</li>
        <li className="flex gap-2"><span className="text-red-600 font-bold">•</span> Không còn xuất hiện trong danh sách POI</li>
        <li className="flex gap-2"><span className="text-amber-600 font-bold">•</span> Âm thanh đã bị ngắt kết nối (không bị xóa)</li>
        <li className="flex gap-2"><span className="text-green-700 font-bold">•</span> Thông tin cửa hàng được giữ nguyên</li>
      </ul>

      {/* Delete type */}
      <div className="hidden bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Loại xóa</p>
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="radio"
            name="deleteType"
            checked={!hardDelete}
            onChange={() => onHardDeleteChange(false)}
            className="mt-0.5 accent-amber-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">
              Xóa mềm <span className="text-xs font-normal text-green-700">(Khuyến nghị)</span>
            </span>
            <p className="text-xs text-gray-700">Có thể khôi phục trong vòng 30 ngày</p>
          </div>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="radio"
            name="deleteType"
            checked={hardDelete}
            onChange={() => onHardDeleteChange(true)}
            className="mt-0.5 accent-red-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">
              Xóa cứng <span className="text-xs font-normal text-red-600">(Vĩnh viễn)</span>
            </span>
            <p className="text-xs text-gray-700">Xóa vĩnh viễn, không thể khôi phục</p>
          </div>
        </label>
      </div>

      {/* Acknowledge checkbox */}
      <label className="flex items-center gap-2.5 mb-6 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledgedChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 accent-red-500"
        />
        <span className="text-sm font-medium text-gray-900">Tôi hiểu rủi ro</span>
      </label>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Hủy
        </button>
        <button
          onClick={onNext}
          disabled={!acknowledged}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Tiếp theo
        </button>
      </div>
    </>
  );
}

// ── Step 2: Type POI name to confirm ─────────────────────────────────────────

function Step2({
  poiName,
  hardDelete,
  onBack,
  onConfirm,
  loading,
}: {
  poiName: string;
  hardDelete: boolean;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === poiName.trim();

  return (
    <>
      <div className="flex items-start gap-3 mb-4">
        <IconWarning />
        <div>
          <h2 className="text-base font-bold text-gray-950">Xác nhận xóa</h2>
          <p className="text-sm text-gray-800 mt-1">
            {hardDelete
              ? "POI sẽ bị xóa vĩnh viễn và không thể khôi phục."
              : "POI sẽ bị xóa mềm và có thể khôi phục trong 30 ngày."}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-1.5">
          Nhập tên POI để xác nhận:{" "}
          <span className="font-semibold text-gray-950">{poiName}</span>
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Nhập chính xác tên POI..."
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {typed.length > 0 && !confirmed && (
          <p className="text-xs text-red-600 mt-1">Tên không khớp</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
        >
          Quay lại
        </button>
        <button
          onClick={onConfirm}
          disabled={!confirmed || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Đang xóa..." : hardDelete ? "Xóa vĩnh viễn" : "Xóa POI"}
        </button>
      </div>
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface DeletePoiDialogProps {
  poiId: number;
  poiName: string;
  onClose: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}

export default function DeletePoiDialog({
  poiId,
  poiName,
  onClose,
  onDeleted,
  onError,
}: DeletePoiDialogProps) {
  const [step, setStep]             = useState<1 | 2>(1);
  const [acknowledged, setAck]      = useState(false);
  const [hardDelete, setHardDelete] = useState(true);
  const [loading, setLoading]       = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await deletePoi(poiId, hardDelete);
      onDeleted();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xóa POI.";
      onError(message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog panel */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Đóng"
        >
          <IconX />
        </button>

        {step === 1 ? (
          <Step1
            poiName={poiName}
            hardDelete={hardDelete}
            onHardDeleteChange={setHardDelete}
            acknowledged={acknowledged}
            onAcknowledgedChange={setAck}
            onCancel={onClose}
            onNext={() => setStep(2)}
          />
        ) : (
          <Step2
            poiName={poiName}
            hardDelete={hardDelete}
            onBack={() => setStep(1)}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
