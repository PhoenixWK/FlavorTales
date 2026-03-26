"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// ── URL resolution ────────────────────────────────────────────────────────────

function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum 3 cm at 300 dpi ≈ 354 px; 400 px gives comfortable margin. */
const CANVAS_SIZE = 400;

const QR_OPTIONS: QRCode.QRCodeRenderersOptions = {
  errorCorrectionLevel: "M",
  width: CANVAS_SIZE,
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AppQrCode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [appUrl, setAppUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = resolveAppUrl();
    setAppUrl(url);
  }, []);

  useEffect(() => {
    if (!appUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, appUrl, QR_OPTIONS).catch(() => {
      setError("Không thể tạo mã QR. Vui lòng thử lại.");
    });
  }, [appUrl]);

  const handleDownload = async () => {
    if (!appUrl) return;
    try {
      const dataUrl = await QRCode.toDataURL(appUrl, {
        ...QR_OPTIONS,
        // Higher resolution for print quality
        width: 800,
        type: "image/png",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "flavortales-qr.png";
      link.click();
    } catch {
      setError("Không thể xuất ảnh QR. Vui lòng thử lại.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm inline-block">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
      </div>

      {appUrl && (
        <p className="text-xs text-gray-400 break-all text-center max-w-xs">
          {appUrl}
        </p>
      )}

      <button
        onClick={handleDownload}
        disabled={!appUrl}
        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Tải xuống PNG
      </button>

      <p className="text-xs text-gray-400 text-center max-w-sm">
        In ảnh ở kích thước tối thiểu 3×3 cm (300 dpi) để đảm bảo khả năng quét.
      </p>
    </div>
  );
}
