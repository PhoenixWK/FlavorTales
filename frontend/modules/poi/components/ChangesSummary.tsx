"use client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FieldChange {
  label: string;
  oldValue: string;
  newValue: string;
}

interface ChangesSummaryProps {
  changes: FieldChange[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChangesSummary({ changes }: ChangesSummaryProps) {
  if (changes.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-800 mb-2">
        Bạn đã thay đổi {changes.length} trường:
      </p>
      <ul className="space-y-1.5">
        {changes.map((c) => (
          <li key={c.label} className="text-amber-700">
            <span className="font-medium">{c.label}:</span>{" "}
            <span className="line-through text-red-400 font-mono text-xs">{c.oldValue}</span>
            <span className="mx-1 text-amber-500">→</span>
            <span className="text-green-700 font-medium font-mono text-xs">{c.newValue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
