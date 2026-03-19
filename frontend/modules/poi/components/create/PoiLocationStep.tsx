"use client";

import dynamic from "next/dynamic";
import type { PoiCreateDraft } from "@/modules/poi/types/poi";
import { BOUNDARY_CENTER, BOUNDARY_RADIUS_M, haversineDistance } from "@/modules/poi/types/poi";

const MapPicker = dynamic(() => import("../MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse flex items-center justify-center text-sm text-gray-400">
      Đang tải bản đồ…
    </div>
  ),
});

export interface Step1Errors {
  poiName?: string;
  location?: string;
  radius?: string;
}

interface Props {
  draft: Pick<PoiCreateDraft, "poiName" | "lat" | "lng" | "radius">;
  errors: Step1Errors;
  onChange: (field: keyof Pick<PoiCreateDraft, "poiName" | "lat" | "lng" | "radius">, value: string | number | null) => void;
  onClearError: (field: keyof Step1Errors) => void;
  onBlurField?: (field: keyof Step1Errors, error: string | undefined) => void;
}

export function validateStep1(
  draft: Pick<PoiCreateDraft, "poiName" | "lat" | "lng" | "radius">
): Step1Errors {
  const errors: Step1Errors = {};

  if (!draft.poiName.trim()) {
    errors.poiName = "Tên POI là bắt buộc.";
  } else if (draft.poiName.trim().length < 3 || draft.poiName.trim().length > 100) {
    errors.poiName = "Tên POI phải từ 3 đến 100 ký tự.";
  }

  if (draft.lat === null || draft.lng === null) {
    errors.location = "Vui lòng chọn vị trí trên bản đồ.";
  } else {
    const dist = haversineDistance(BOUNDARY_CENTER, [draft.lat, draft.lng]);
    if (dist > BOUNDARY_RADIUS_M) {
      errors.location = "Tọa độ nằm ngoài khu phố ẩm thực.";
    }
  }

  if (draft.radius < 10 || draft.radius > 100) {
    errors.radius = "Bán kính phải từ 10 đến 100 mét.";
  }

  return errors;
}

export default function PoiLocationStep({ draft, errors, onChange, onClearError, onBlurField }: Props) {
  const handleMapChange = (lat: number, lng: number) => {
    onChange("lat", lat);
    onChange("lng", lng);
    onClearError("location");
  };

  return (
    <div className="space-y-5">
      {/* POI Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tên POI <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={draft.poiName}
          onChange={(e) => {
            onChange("poiName", e.target.value);
            onClearError("poiName");
          }}
          onBlur={() => {
            const v = draft.poiName.trim();
            if (!v) onBlurField?.("poiName", "Tên POI là bắt buộc.");
            else if (v.length < 3 || v.length > 100) onBlurField?.("poiName", "Tên POI phải từ 3 đến 100 ký tự.");
            else onBlurField?.("poiName", undefined);
          }}
          placeholder="VD: Bún chả Hương Liên"
          maxLength={100}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
            errors.poiName ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
        {errors.poiName && <p className="mt-1 text-xs text-red-500">{errors.poiName}</p>}
      </div>

      {/* Map picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vị trí trên bản đồ <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">Nhấn trên bản đồ để ghim vị trí</span>
        </label>
        <MapPicker
          lat={draft.lat}
          lng={draft.lng}
          radius={draft.radius}
          onChange={handleMapChange}
        />
        {draft.lat !== null && draft.lng !== null ? (
          <p className="mt-1.5 text-xs text-gray-500">
            Đã chọn:{" "}
            <span className="font-mono text-gray-700">
              {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
            </span>
            {" "}· kéo marker để điều chỉnh.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-400">Chưa chọn vị trí.</p>
        )}
        {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
      </div>

      {/* Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bán kính (mét) <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">10 – 100 m · mặc định 50 m</span>
        </label>
        <input
          type="number"
          value={draft.radius}
          onChange={(e) => {
            onChange("radius", parseInt(e.target.value, 10) || 50);
            onClearError("radius");
          }}
          onBlur={() => {
            if (draft.radius < 10 || draft.radius > 100) onBlurField?.("radius", "Bán kính phải từ 10 đến 100 mét.");
            else onBlurField?.("radius", undefined);
          }}
          placeholder="50"
          min={10}
          max={100}
          step={1}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
            errors.radius ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
        {errors.radius && <p className="mt-1 text-xs text-red-500">{errors.radius}</p>}
      </div>
    </div>
  );
}
