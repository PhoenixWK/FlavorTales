"use client";

import { useEffect, useState } from "react";

interface LiveStatCardProps {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  /** Controlled mode: value is sourced externally (e.g. WebSocket). Skips polling. */
  value?: number | null;
  /** Polling mode: async function that fetches the current value. */
  fetcher?: () => Promise<number>;
  pollIntervalMs?: number;
}

export default function LiveStatCard({
  label,
  icon,
  color = "bg-blue-500",
  value: controlledValue,
  fetcher,
  pollIntervalMs = 30_000,
}: LiveStatCardProps) {
  const [polledValue, setPolledValue] = useState<number | null>(null);
  const [error, setError] = useState(false);

  // Polling mode — only active when no controlled value is provided.
  useEffect(() => {
    if (controlledValue !== undefined || !fetcher) return;

    let cancelled = false;

    async function load() {
      try {
        const v = await fetcher!();
        if (!cancelled) {
          setPolledValue(v);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    const id = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [controlledValue, fetcher, pollIntervalMs]);

  const displayValue = controlledValue !== undefined ? controlledValue : polledValue;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          {error ? (
            <p className="text-sm text-red-400 mt-1">Failed to load</p>
          ) : displayValue === null ? (
            <p className="text-2xl font-bold text-gray-300 mt-1 animate-pulse">—</p>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{displayValue.toLocaleString()}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {icon && (
            <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white text-xl`}>
              {icon}
            </div>
          )}
          <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
