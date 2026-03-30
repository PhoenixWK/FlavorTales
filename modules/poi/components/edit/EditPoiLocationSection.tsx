"use client";

import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("../MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-85 rounded-xl border border-gray-200 bg-gray-50 animate-pulse flex items-center justify-center text-sm text-gray-400">
      Đang tải bản đồ…
    </div>
  ),
});

interface Props {
  lat: number | null;
  lng: number | null;
  radius: string;
  address: string;
  errors: { location?: string; radius?: string; address?: string };
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (value: string) => void;
  onAddressChange: (value: string) => void;
}

export default function EditPoiLocationSection({
  lat,
  lng,
  radius,
  address,
  errors,
  onLocationChange,
  onRadiusChange,
  onAddressChange,
}: Props) {
  const previewRadius = parseFloat(radius) || 50;
  const numericRadius = parseFloat(radius);

  return (
    <div className="space-y-5">
      {/* Map picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vị trí trên bản đồ <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">
            Kéo marker để điều chỉnh
          </span>
        </label>
        <MapPicker
          lat={lat}
          lng={lng}
          radius={previewRadius}
          onChange={onLocationChange}
        />
        {lat !== null && lng !== null ? (
          <p className="mt-1.5 text-xs text-gray-500">
            Đã chọn:{" "}
            <span className="font-mono text-gray-700">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </span>
            {" "}· kéo marker để điều chỉnh
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-400">Chưa chọn vị trí.</p>
        )}
        {errors.location && (
          <p className="mt-1 text-xs text-red-500">{errors.location}</p>
        )}
      </div>

      {/* Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bán kính phủ sóng <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">10 – 100 m</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={isNaN(numericRadius) ? 50 : numericRadius}
            onChange={(e) => onRadiusChange(e.target.value)}
            className="flex-1 accent-orange-500"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              name="radius"
              value={radius}
              onChange={(e) => onRadiusChange(e.target.value)}
              placeholder="50"
              min={10}
              max={100}
              step={1}
              className={`w-20 px-3 py-2 rounded-lg border text-sm text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ${
                errors.radius ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            <span className="text-sm text-gray-500">m</span>
          </div>
        </div>
        {errors.radius && (
          <p className="mt-1 text-xs text-red-500">{errors.radius}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Địa chỉ
          <span className="ml-2 text-xs text-gray-400 font-normal">Không bắt buộc · tối đa 500 ký tự</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="VD: 24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội"
          maxLength={500}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ${
            errors.address ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
        {errors.address && (
          <p className="mt-1 text-xs text-red-500">{errors.address}</p>
        )}
      </div>
    </div>
  );
}
