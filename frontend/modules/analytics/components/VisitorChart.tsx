"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchVisitorStats,
  VisitorPeriod,
  VisitorStatPoint,
} from "../services/analyticsApi";

const PERIODS: { value: VisitorPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function VisitorChart() {
  const [period, setPeriod] = useState<VisitorPeriod>("day");
  const [data, setData] = useState<VisitorStatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchVisitorStats(period)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [period]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Visitor Traffic</h3>
          <p className="text-xs text-gray-400 mt-0.5">Number of unique tourist sessions</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          Loading…
        </div>
      ) : error ? (
        <div className="h-52 flex items-center justify-center text-sm text-red-400">
          Failed to load data
        </div>
      ) : data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          No visitor data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={208}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #f3f4f6",
                fontSize: "12px",
              }}
              formatter={(value) => [value ?? 0, "Visitors"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#visitorGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#f97316" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
