"use client";

interface StallDetailActionBarProps {
  onAccept: () => void;
  onDecline: () => void;
  busy: boolean;
  actionTaken: "accepted" | "declined" | null;
  actionError: string | null;
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
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

export default function StallDetailActionBar({
  onAccept,
  onDecline,
  busy,
  actionTaken,
  actionError,
}: StallDetailActionBarProps) {
  return (
    <div className="space-y-3">
      {actionError && (
        <p className="text-sm text-red-500 text-center">{actionError}</p>
      )}
      {actionTaken ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm text-center font-medium ${
            actionTaken === "accepted"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}
        >
          {actionTaken === "accepted"
            ? "Stall accepted! Redirecting…"
            : "Stall declined. Redirecting…"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onDecline}
            disabled={busy}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-60"
          >
            <IconX />
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={busy}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm transition disabled:opacity-60"
          >
            <IconCheck />
            Accept Stall
          </button>
        </div>
      )}
    </div>
  );
}
