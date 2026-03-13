"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  updatePoi,
  getAvailableShops,
  type PoiResponse,
  type ShopOption,
} from "@/modules/poi/services/poiApi";
import Toast, { type ToastData } from "@/shared/components/Toast";
import ChangesSummary, { type FieldChange } from "./ChangesSummary";

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
  /** 0 = unlink, null = no linked shop, positive = linked shop id */
  shopId: number | null;
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

// ── Change tracking ───────────────────────────────────────────────────────────

function computeChanges(
  initial: PoiResponse,
  current: FormData,
  availableShops: ShopOption[]
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (current.name.trim() !== initial.name) {
    changes.push({ label: "Name", oldValue: initial.name, newValue: current.name.trim() });
  }

  const latChanged =
    current.lat !== null &&
    Math.abs(current.lat - Number(initial.latitude)) > 1e-7;
  const lngChanged =
    current.lng !== null &&
    Math.abs(current.lng - Number(initial.longitude)) > 1e-7;

  if (latChanged || lngChanged) {
    changes.push({
      label: "Location",
      oldValue: `${Number(initial.latitude).toFixed(6)}, ${Number(initial.longitude).toFixed(6)}`,
      newValue: `${(current.lat ?? 0).toFixed(6)}, ${(current.lng ?? 0).toFixed(6)}`,
    });
  }

  const currentRadius = parseFloat(current.radius);
  if (!isNaN(currentRadius) && Math.abs(currentRadius - Number(initial.radius)) > 0.01) {
    changes.push({
      label: "Radius",
      oldValue: `${initial.radius} m`,
      newValue: `${currentRadius} m`,
    });
  }

  const initialShopId = initial.linkedShopId ?? null;
  if (current.shopId !== initialShopId) {
    const oldShopLabel = initial.linkedShopName
      ? `${initial.linkedShopName} (ID: ${initialShopId})`
      : initialShopId != null
      ? `Shop #${initialShopId}`
      : "None";
    let newShopLabel = "None (unlinked)";
    if (current.shopId != null && current.shopId > 0) {
      const shop = availableShops.find((s) => s.shopId === current.shopId);
      newShopLabel = shop ? `${shop.name} (ID: ${current.shopId})` : `Shop #${current.shopId}`;
    }
    changes.push({ label: "Shop", oldValue: oldShopLabel, newValue: newShopLabel });
  }

  return changes;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditPoiFormProps {
  initialPoi: PoiResponse;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export default function EditPoiForm({ initialPoi }: EditPoiFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: initialPoi.name,
    lat: Number(initialPoi.latitude),
    lng: Number(initialPoi.longitude),
    radius: String(initialPoi.radius),
    shopId: initialPoi.linkedShopId ?? null,
  });

  const [errors, setErrors]           = useState<FormErrors>({});
  const [isLoading, setIsLoading]     = useState(false);
  const [toast, setToast]             = useState<ToastData | null>(null);
  const [availableShops, setAvailableShops] = useState<ShopOption[]>([]);

  // Fetch available shops for the shop dropdown
  useEffect(() => {
    getAvailableShops()
      .then((res) => setAvailableShops(res.data ?? []))
      .catch(() => {/* non-critical; dropdown will still show current shop */});
  }, []);

  const previewRadius = parseFloat(formData.radius) || 50;

  const changes = useMemo(
    () => computeChanges(initialPoi, formData, availableShops),
    [initialPoi, formData, availableShops]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleMapChange = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
    setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const handleShopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    // "" → keep current (don't change), "0" → unlink, positive number → new shop
    setFormData((prev) => ({
      ...prev,
      shopId: val === "" ? initialPoi.linkedShopId ?? null : Number(val),
    }));
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
      const payload = {
        name: formData.name.trim(),
        latitude: parseFloat((formData.lat!).toFixed(6)),
        longitude: parseFloat((formData.lng!).toFixed(6)),
        radius: parseFloat(formData.radius),
        // Only include shopId if it actually changed
        ...(formData.shopId !== (initialPoi.linkedShopId ?? null)
          ? { shopId: formData.shopId ?? 0 }
          : {}),
      };

      const res = await updatePoi(initialPoi.poiId, payload);
      setToast({ type: "success", message: res.message ?? "POI updated successfully!" });
      setTimeout(() => router.push("/vendor/poi"), 2500);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update POI. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Build the shop dropdown options
  const shopDropdownOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "0", label: "No shop linked" },
    ];
    // If a shop is currently linked, include it as the first real option
    if (initialPoi.linkedShopId != null) {
      const currentLabel = initialPoi.linkedShopName
        ? `${initialPoi.linkedShopName} (current)`
        : `Shop #${initialPoi.linkedShopId} (current)`;
      opts.push({ value: String(initialPoi.linkedShopId), label: currentLabel });
    }
    // Add available (unlinked) shops, excluding the already-linked one
    availableShops
      .filter((s) => s.shopId !== initialPoi.linkedShopId)
      .forEach((s) => opts.push({ value: String(s.shopId), label: s.name }));
    return opts;
  }, [availableShops, initialPoi.linkedShopId, initialPoi.linkedShopName]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast notification */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

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
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Location — interactive map picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-400 font-normal">
              Click on the map or drag the marker to adjust
            </span>
          </label>
          <MapPicker
            lat={formData.lat}
            lng={formData.lng}
            radius={previewRadius}
            onChange={handleMapChange}
          />
          {formData.lat !== null && formData.lng !== null ? (
            <p className="mt-1.5 text-xs text-gray-500">
              Selected:{" "}
              <span className="font-mono text-gray-700">
                {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
              </span>
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
            <span className="ml-2 text-xs text-gray-400 font-normal">10 – 200 m</span>
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
          {errors.radius && <p className="mt-1 text-xs text-red-500">{errors.radius}</p>}
        </div>

        {/* Shop link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Linked Shop
            <span className="ml-2 text-xs text-gray-400 font-normal">optional</span>
          </label>
          <select
            name="shopId"
            value={formData.shopId != null ? String(formData.shopId) : "0"}
            onChange={handleShopChange}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {shopDropdownOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Only shops without an existing POI are shown as new options.
          </p>
        </div>

        {/* Change tracking summary */}
        <ChangesSummary changes={changes} />

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 active:scale-[.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving changes…" : `Save changes${changes.length > 0 ? ` (${changes.length} field${changes.length > 1 ? "s" : ""})` : ""}`}
        </button>
      </form>
    </div>
  );
}
