"use client";

import { useRef, useEffect } from "react";

export type ReviewAction = "accept" | "decline";

interface AdminPoiConfirmDialogProps {
  action: ReviewAction;
  shopName: string;
  notes: string;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

const CONFIG = {
  accept: {
    title: "Approve POI & Stall",
    question: (name: string) =>
      `Are you sure you want to approve "${name}"? The POI and its linked stall will become visible to all users.`,
    notesLabel: "Notes for vendor (optional)",
    notesPlaceholder: "e.g. Looks great! Your stall is now live.",
    confirmClass:
      "bg-green-500 hover:bg-green-600 active:bg-green-700 text-white",
    confirmLabel: "Approve",
  },
  decline: {
    title: "Decline POI & Stall",
    question: (name: string) =>
      `Are you sure you want to decline "${name}"? The POI and its linked stall will be marked as rejected.`,
    notesLabel: "Reason / notes for vendor (optional)",
    notesPlaceholder: "e.g. Location coordinates appear inaccurate. Please resubmit.",
    confirmClass: "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white",
    confirmLabel: "Decline",
  },
} as const;

export default function AdminPoiConfirmDialog({
  action,
  shopName,
  notes,
  onNotesChange,
  onConfirm,
  onCancel,
  busy,
}: AdminPoiConfirmDialogProps) {
  const cfg = CONFIG[action];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when dialog opens
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{cfg.title}</h2>

        <p className="text-sm text-gray-600">{cfg.question(shopName)}</p>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
            {cfg.notesLabel}
          </label>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={cfg.notesPlaceholder}
            rows={3}
            disabled={busy}
            className="w-full text-sm text-gray-900 placeholder-gray-400 rounded-xl border border-gray-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-60"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${cfg.confirmClass}`}
          >
            {busy ? "Processing…" : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
