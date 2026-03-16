"use client";

import { useEffect } from "react";
import { Toast, useToast } from "@/shared/hooks/useToast";

interface Props {
  toast: Toast;
}

export default function ToastItem({ toast }: Props) {
  const { removeToast } = useToast();

  // Auto-dismiss when a duration is set
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => removeToast(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const bgColor: Record<Toast["type"], string> = {
    loading: "bg-gray-800",
    success: "bg-green-600",
    error: "bg-red-600",
  };

  const icon: Record<Toast["type"], React.ReactNode> = {
    loading: (
      <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
    ),
    success: <span className="shrink-0 font-bold text-base leading-none">✓</span>,
    error: <span className="shrink-0 font-bold text-base leading-none">✕</span>,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm
        shadow-lg min-w-64 max-w-xs ${bgColor[toast.type]}`}
    >
      {icon[toast.type]}
      <p className="flex-1 leading-snug">{toast.message}</p>
      {toast.type !== "loading" && (
        <button
          onClick={() => removeToast(toast.id)}
          aria-label="Đóng thông báo"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1 leading-none"
        >
          ✕
        </button>
      )}
    </div>
  );
}
