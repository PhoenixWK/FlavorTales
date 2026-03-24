"use client";

import { useState } from "react";
import type {
  MockGpsScenario,
  MockGpsConfig,
} from "@/modules/location/hooks/useMockGpsProvider";

const SCENARIOS: { value: MockGpsScenario; label: string }[] = [
  { value: "straight_walk",       label: "Đi thẳng (walking)" },
  { value: "stationary_overlap",  label: "Đứng yên (overlap)" },
  { value: "fast_moving",         label: "Di chuyển nhanh (xe)" },
  { value: "gps_lost",            label: "Mất GPS (> 10 s)" },
  { value: "weak_gps",            label: "GPS yếu (accuracy 20 m)" },
];

/**
 * NFR-GEO-T01: Dev-only floating panel for controlling mock GPS scenarios.
 * Only rendered when NEXT_PUBLIC_MOCK_GPS=true.
 */
export default function MockGpsPanel() {
  const [scenario, setScenario] = useState<MockGpsScenario>("straight_walk");
  const [startLat, setStartLat] = useState("16.0000");
  const [startLng, setStartLng] = useState("107.5000");
  const [endLat,   setEndLat]   = useState("16.0010");
  const [endLng,   setEndLng]   = useState("107.5010");
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = () => {
    const config: MockGpsConfig = {
      scenario,
      startCoord: [parseFloat(startLat), parseFloat(startLng)],
      endCoord:   [parseFloat(endLat),   parseFloat(endLng)],
      steps: 20,
      intervalMs: 1_000,
    };
    window.__MOCK_GPS_CONFIG = config;
    window.__mockGpsUpdate?.(config);
    setIsRunning(true);
  };

  const handleStop = () => {
    window.__MOCK_GPS_CONFIG = undefined;
    window.__mockGpsUpdate?.({ scenario: "gps_lost" });
    setIsRunning(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-yellow-50 border-2 border-yellow-400 rounded-xl shadow-xl p-3 w-64 text-xs font-mono">
      <div className="font-bold text-yellow-800 mb-2">🛰 Mock GPS (DEV)</div>

      <label className="block text-gray-600 mb-0.5">Kịch bản</label>
      <select
        value={scenario}
        onChange={(e) => setScenario(e.target.value as MockGpsScenario)}
        className="w-full border rounded px-1.5 py-1 mb-2 text-xs bg-white"
      >
        {SCENARIOS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-1 mb-2">
        {[
          { label: "Start Lat", value: startLat, set: setStartLat },
          { label: "Start Lng", value: startLng, set: setStartLng },
          { label: "End Lat",   value: endLat,   set: setEndLat   },
          { label: "End Lng",   value: endLng,   set: setEndLng   },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <div className="text-gray-500">{label}</div>
            <input
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full border rounded px-1 py-0.5 text-xs bg-white"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          className="flex-1 bg-green-600 text-white rounded py-1 hover:bg-green-700 transition-colors"
        >
          ▶ Start
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className="flex-1 bg-red-500 text-white rounded py-1 hover:bg-red-600 disabled:opacity-40 transition-colors"
        >
          ■ Stop
        </button>
      </div>
    </div>
  );
}
