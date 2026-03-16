"use client";

import { useToast } from "@/shared/hooks/useToast";
import ToastItem from "./ToastItem";

/**
 * Fixed bottom-right container that renders all active toasts.
 * Must be placed inside <ToastProvider>.
 */
export default function ToastList() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
