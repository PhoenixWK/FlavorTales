"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updatePoi,
  type PoiResponse,
} from "@/modules/poi/services/poiApi";
import { updateShop, type ShopDetail } from "@/modules/shop/services/shopApi";
import { uploadImage } from "@/modules/shop/services/fileApi";
import { uploadAudiosForShop } from "@/modules/audio/services/audioApi";
import type { ImageSlot } from "@/modules/shop/components/create/ShopImageUpload";
import Toast, { type ToastData } from "@/shared/components/Toast";
import ChangesSummary, { type FieldChange } from "./ChangesSummary";
import FormSection from "./create/FormSection";
import EditPoiNameSection from "./edit/EditPoiNameSection";
import EditPoiLocationSection from "./edit/EditPoiLocationSection";
import EditShopSection, {
  type ShopEditDraft,
  type ShopEditErrors,
  initShopEditDraft,
  validateShopEdit,
} from "./edit/EditShopSection";

// ── POI form state & validation ───────────────────────────────────────────────

interface PoiFormData {
  name: string;
  lat: number | null;
  lng: number | null;
  radius: string;
}

interface PoiFormErrors {
  name?: string;
  location?: string;
  radius?: string;
}

function validatePoi(data: PoiFormData): PoiFormErrors {
  const errors: PoiFormErrors = {};
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

function computePoiChanges(initial: PoiResponse, current: PoiFormData): FieldChange[] {
  const changes: FieldChange[] = [];
  if (current.name.trim() !== initial.name) {
    changes.push({ label: "Tên POI", oldValue: initial.name, newValue: current.name.trim() });
  }
  const latDiff = current.lat !== null && Math.abs(current.lat - Number(initial.latitude)) > 1e-7;
  const lngDiff = current.lng !== null && Math.abs(current.lng - Number(initial.longitude)) > 1e-7;
  if (latDiff || lngDiff) {
    changes.push({
      label: "Vị trí",
      oldValue: `${Number(initial.latitude).toFixed(6)}, ${Number(initial.longitude).toFixed(6)}`,
      newValue: `${(current.lat ?? 0).toFixed(6)}, ${(current.lng ?? 0).toFixed(6)}`,
    });
  }
  const r = parseFloat(current.radius);
  if (!isNaN(r) && Math.abs(r - Number(initial.radius)) > 0.01) {
    changes.push({ label: "Bán kính", oldValue: `${initial.radius} m`, newValue: `${r} m` });
  }
  return changes;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditPoiFormProps {
  initialPoi: PoiResponse;
  shopDetail: ShopDetail;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export default function EditPoiForm({ initialPoi, shopDetail }: EditPoiFormProps) {
  const router = useRouter();

  // POI fields
  const [poiData, setPoiData] = useState<PoiFormData>({
    name: initialPoi.name,
    lat: Number(initialPoi.latitude),
    lng: Number(initialPoi.longitude),
    radius: String(initialPoi.radius),
  });
  const [poiErrors, setPoiErrors] = useState<PoiFormErrors>({});

  // Shop fields
  const [shopDraft, setShopDraft] = useState<ShopEditDraft>(() => initShopEditDraft(shopDetail));
  const [shopErrors, setShopErrors] = useState<ShopEditErrors>({});

  // Files held outside draft (not serialisable)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  // Initialise slots from existing gallery so current images are visible on load
  const [additionalSlots, setAdditionalSlots] = useState<ImageSlot[]>(() =>
    (shopDetail.galleryUrls ?? []).map((url) => ({ previewUrl: url }))
  );
  const [audioBlobs, setAudioBlobs] = useState<{ vi?: Blob; en?: Blob; zh?: Blob }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const poiChanges = useMemo(() => computePoiChanges(initialPoi, poiData), [initialPoi, poiData]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setPoiData((prev) => ({ ...prev, lat, lng }));
    setPoiErrors((prev) => ({ ...prev, location: undefined }));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const updatePoiField = useCallback(
    <K extends keyof PoiFormData>(key: K, value: PoiFormData[K]) => {
      setPoiData((prev) => ({ ...prev, [key]: value }));
      setPoiErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const handleShopChange = useCallback((patch: Partial<ShopEditDraft>) => {
    setShopDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleClearShopError = useCallback((field: keyof ShopEditErrors) => {
    setShopErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleAudioGenerated = useCallback((language: "vi" | "en" | "zh", blob: Blob, blobUrl: string) => {
    setAudioBlobs((prev) => ({ ...prev, [language]: blob }));
    if (language === "vi") setShopDraft((prev) => ({ ...prev, viAudioUrl: blobUrl }));
    else if (language === "en") setShopDraft((prev) => ({ ...prev, enAudioUrl: blobUrl }));
    else setShopDraft((prev) => ({ ...prev, zhAudioUrl: blobUrl }));
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const pErrors = validatePoi(poiData);
    const sErrors = validateShopEdit(shopDraft);
    if (Object.keys(pErrors).length > 0 || Object.keys(sErrors).length > 0) {
      setPoiErrors(pErrors);
      setShopErrors(sErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsLoading(true);
    try {
      // Upload new avatar if changed, otherwise null → backend keeps existing
      let newAvatarFileId: number | null = null;
      if (avatarFile) {
        const res = await uploadImage(avatarFile);
        if (!res.success) throw new Error(res.message ?? "Tải ảnh bìa thất bại.");
        newAvatarFileId = res.data.fileId;
      }

      // Upload new gallery images if any
      let additionalImageIds: number[] | undefined;
      if (additionalFiles.length > 0) {
        const results = await Promise.all(additionalFiles.map((f) => uploadImage(f)));
        for (const r of results) {
          if (!r.success) throw new Error(r.message ?? "Tải ảnh bổ sung thất bại.");
        }
        additionalImageIds = results.map((r) => r.data.fileId);
      }

      // Upload new audio blobs if any; non-blocking per language
      uploadAudiosForShop(shopDetail.shopId, audioBlobs, (lang, err) => {
        console.error(`Audio upload failed for ${lang}:`, err);
      });

      // Update shop (resets shop + POI to pending)
      await updateShop(shopDetail.shopId, {
        name: shopDraft.name.trim(),
        description: shopDraft.description,
        avatarFileId: newAvatarFileId ?? undefined,
        additionalImageIds,
        specialtyDescription: shopDraft.specialtyDescription,
        openingHours: shopDraft.openingHours,
        tags: shopDraft.tags,
      });

      // Update POI location/name if changed
      if (poiChanges.length > 0) {
        await updatePoi(initialPoi.poiId, {
          name: poiData.name.trim(),
          latitude: parseFloat((poiData.lat!).toFixed(6)),
          longitude: parseFloat((poiData.lng!).toFixed(6)),
          radius: parseFloat(poiData.radius),
        });
      }

      setToast({
        type: "success",
        message: "Cập nhật thành công! POI đang chờ duyệt lại.",
      });
      setTimeout(() => router.push("/vendor/poi"), 2500);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Cập nhật thất bại. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Review notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Sau khi lưu, thông tin sẽ được gửi cho admin xem xét. POI sẽ chuyển sang trạng
        thái <strong>Đang chờ duyệt</strong> trong thời gian đó.
      </div>

      {/* ── Thông tin gian hàng ──────────────────────────────────────────────── */}
      <EditShopSection
        draft={shopDraft}
        errors={shopErrors}
        additionalSlots={additionalSlots}
        onChange={handleShopChange}
        onAvatarFileChange={(file, _previewUrl) => setAvatarFile(file)}
        onAdditionalSlotsChange={(slots, files) => {
          setAdditionalSlots(slots);
          setAdditionalFiles(files);
        }}
        onAudioGenerated={handleAudioGenerated}
        onClearError={handleClearShopError}
      />

      {/* ── Vị trí POI ───────────────────────────────────────────────────────── */}
      <FormSection title="Vị trí & Bán kính">
        <EditPoiNameSection
          name={poiData.name}
          error={poiErrors.name}
          onChange={(value) => updatePoiField("name", value)}
        />
        <div className="mt-4">
          <EditPoiLocationSection
            lat={poiData.lat}
            lng={poiData.lng}
            radius={poiData.radius}
            errors={{ location: poiErrors.location, radius: poiErrors.radius }}
            onLocationChange={handleLocationChange}
            onRadiusChange={(value) => updatePoiField("radius", value)}
          />
        </div>
      </FormSection>

      {/* ── Tóm tắt thay đổi vị trí ─────────────────────────────────────────── */}
      {poiChanges.length > 0 && <ChangesSummary changes={poiChanges} />}

      {/* ── Hành động ────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-2">
        <button
          type="button"
          onClick={() => router.push("/vendor/poi")}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 active:scale-[.98] transition"
        >
          {isLoading ? "Đang lưu…" : "Lưu & Gửi duyệt"}
        </button>
      </div>
    </div>
  );
}

