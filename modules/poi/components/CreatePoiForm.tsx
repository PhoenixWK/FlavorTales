"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createPoi } from "@/modules/poi/services/poiApi";
import Toast, { type ToastData } from "@/shared/components/Toast";

// Load MapPicker client-side only — Leaflet requires the DOM (no SSR)
const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse flex items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Validation ────────────────────────────────────────────────────────────────

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "POI name is required";
  } else if (data.name.trim().length < 3 || data.name.trim().length > 100) {
    errors.name = "POI name must be between 3 and 100 characters";
  }

  if (data.lat === null || data.lng === null) {
    errors.location = "Please click on the map to select a location";
  }

  const radius = parseFloat(data.radius);
  if (!data.radius.trim()) {
    errors.radius = "Radius is required";
  } else if (isNaN(radius) || radius < 10 || radius > 200) {
    errors.radius = "Radius must be between 10 and 200 metres";
  }

  return errors;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export default function CreatePoiForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    lat: null,
    lng: null,
    radius: "50",
  });

  const [errors, setErrors]       = useState<FormErrors>({});
  const [isLoading, setIsLoading]  = useState(false);
  const [toast, setToast]          = useState<ToastData | null>(null);

  const previewRadius = parseFloat(formData.radius) || 50;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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
      const res = await createPoi({
        name: formData.name.trim(),
        // Round to 6 d.p. so backend @Digits(fraction=6) is satisfied
        // (Leaflet gives full IEEE-754 precision which can exceed 6 places in JSON)
        latitude: parseFloat(formData.lat!.toFixed(6)),
        longitude: parseFloat(formData.lng!.toFixed(6)),
        radius: parseFloat(formData.radius),
      });
      setToast({ type: "success", message: res.message ?? "POI created successfully!" });
      setTimeout(() => router.push("/vendor/poi"), 2500);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create POI. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* POI Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            POI Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Bún chả Hương Liên"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
              errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Location — interactive map picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-400 font-normal">Click on the map to pin your stall location</span>
          </label>
          <MapPicker
            lat={formData.lat}
            lng={formData.lng}
            radius={previewRadius}
            onChange={handleMapChange}
          />
          {formData.lat !== null && formData.lng !== null ? (
            <p className="mt-1.5 text-xs text-gray-500">
              Selected: <span className="font-mono text-gray-700">{formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}</span>
              &nbsp;·&nbsp;drag the marker to adjust.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-400">No location selected yet.</p>
          )}
          {errors.location && (
            <p className="mt-1 text-xs text-red-500">{errors.location}</p>
          )}
        </div>

        {/* Radius */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radius (metres) <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-400 font-normal">10 – 200 m · default 50 m</span>
          </label>
          <input
            type="number"
            name="radius"
            value={formData.radius}
            onChange={handleChange}
            placeholder="50"
            min="10"
            max="200"
            step="1"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
              errors.radius ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.radius && (
            <p className="mt-1 text-xs text-red-500">{errors.radius}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 active:scale-[.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating POI…" : "Create POI"}
        </button>
      </form>
    </div>
  );
}
