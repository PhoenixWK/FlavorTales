"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  updatePoi,
  type PoiResponse,
} from "@/modules/poi/services/poiApi";
import Toast, { type ToastData } from "@/shared/components/Toast";
import ChangesSummary, { type FieldChange } from "./ChangesSummary";

// Load MapPicker client-side only -- Leaflet requires the DOM (no SSR)
const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse flex items-center justify-center text-sm text-gray-400">
      Đang tải bản đồ…
    </div>
  ),
});

// -- Types -----------------------------------------------------------------------

interface FormData {
  name: string;
  lat: number | null;
  lng: number | null;
  radius: string;
}

interface FormErrors {
  name?: string;
  location?: string;
  radius?: string;
}

// -- Validation ------------------------------------------------------------------

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "Tên POI là bắt buộc.";
  } else if (data.name.trim().length < 3 || data.name.trim().length > 100) {
    errors.name = "Tên POI phải từ 3 đến 100 ký tự.";
  }

  if (data.lat === null || data.lng === null) {
    errors.location = "Vui lòng chọn vị trí trên bản đồ.";
  }

  const radius = parseFloat(data.radius);
  if (!data.radius.trim()) {
    errors.radius = "Bán kính là bắt buộc.";
  } else if (isNaN(radius) || radius < 10 || radius > 100) {
    errors.radius = "Bán kính phải từ 10 đến 100 mét.";
  }

  return errors;
}

// -- Change tracking -------------------------------------------------------------

function computeChanges(initial: PoiResponse, current: FormData): FieldChange[] {
  const changes: FieldChange[] = [];

  if (current.name.trim() !== initial.name) {
    changes.push({ label: "Tên", oldValue: initial.name, newValue: current.name.trim() });
  }

  const latChanged = current.lat !== null && Math.abs(current.lat - Number(initial.latitude)) > 1e-7;
  const lngChanged = current.lng !== null && Math.abs(current.lng - Number(initial.longitude)) > 1e-7;
  if (latChanged || lngChanged) {
    changes.push({
      label: "Vị trí",
      oldValue: `${Number(initial.latitude).toFixed(6)}, ${Number(initial.longitude).toFixed(6)}`,
      newValue: `${(current.lat ?? 0).toFixed(6)}, ${(current.lng ?? 0).toFixed(6)}`,
    });
  }

  const currentRadius = parseFloat(current.radius);
  if (!isNaN(currentRadius) && Math.abs(currentRadius - Number(initial.radius)) > 0.01) {
    changes.push({ label: "Bán kính", oldValue: `${initial.radius} m`, newValue: `${currentRadius} m` });
  }

  return changes;
}

// -- Props -----------------------------------------------------------------------

interface EditPoiFormProps {
  initialPoi: PoiResponse;
}

// -- Form ------------------------------------------------------------------------

export default function EditPoiForm({ initialPoi }: EditPoiFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: initialPoi.name,
    lat: Number(initialPoi.latitude),
    lng: Number(initialPoi.longitude),
    radius: String(initialPoi.radius),
  });

  const [errors, setErrors]       = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast]         = useState<ToastData | null>(null);

  const previewRadius = parseFloat(formData.radius) || 50;
  const changes = useMemo(() => computeChanges(initialPoi, formData), [initialPoi, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name in errors) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleMapChange = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
    setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await updatePoi(initialPoi.poiId, {
        name: formData.name.trim(),
        latitude: parseFloat((formData.lat!).toFixed(6)),
        longitude: parseFloat((formData.lng!).toFixed(6)),
        radius: parseFloat(formData.radius),
      });
      setToast({ type: "success", message: res.message ?? "Cập nhật POI thành công!" });
      setTimeout(() => router.push("/vendor/poi"), 2500);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Cập nhật POI thất bại. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* POI Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên POI <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="VD: Bún chả Hương Liên"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
              errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vị trí trên bản đồ <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-400 font-normal">Kéo marker để điều chỉnh</span>
          </label>
          <MapPicker
            lat={formData.lat}
            lng={formData.lng}
            radius={previewRadius}
            onChange={handleMapChange}
          />
          {formData.lat !== null && formData.lng !== null ? (
            <p className="mt-1.5 text-xs text-gray-500">
              Đã chọn:{" "}
              <span className="font-mono text-gray-700">
                {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
              </span>
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
            <span className="ml-2 text-xs text-gray-400 font-normal">10 – 100 m</span>
          </label>
          <input
            type="number"
            name="radius"
            value={formData.radius}
            onChange={handleChange}
            placeholder="50"
            min="10"
            max="100"
            step="1"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
              errors.radius ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.radius && <p className="mt-1 text-xs text-red-500">{errors.radius}</p>}
        </div>

        {/* Change summary */}
        <ChangesSummary changes={changes} />

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 active:scale-[.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Đang lưu…"
            : `Lưu thay đổi${changes.length > 0 ? ` (${changes.length} trường)` : ""}`}
        </button>
      </form>
    </div>
  );
}
