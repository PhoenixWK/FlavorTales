"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error";

export interface ToastData {
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: () => void;
  /** Auto-dismiss delay in milliseconds. Defaults to 4000. */
  duration?: number;
}

export default function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  const isSuccess = toast.type === "success";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-6 right-6 z-50 flex items-start gap-3 rounded-xl px-4 py-3.5 shadow-lg border max-w-sm w-full ${
        isSuccess
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}
    >
      <span className="mt-0.5 text-lg leading-none font-bold" aria-hidden>
        {isSuccess ? "✓" : "✕"}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-current opacity-50 hover:opacity-100 transition text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
