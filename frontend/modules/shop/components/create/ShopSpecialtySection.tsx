"use client";

import { DAY_LABELS, OpeningHoursDto } from "@/modules/shop/types/shop";

const BOOTH_TYPES = [
  { value: "Nhà hàng", icon: "🍜", label: "Nhà hàng" },
  { value: "Quán ăn", icon: "🥘", label: "Quán ăn" },
  { value: "Cà phê", icon: "☕", label: "Cà phê" },
  { value: "Tiệm bánh", icon: "🥖", label: "Tiệm bánh" },
  { value: "Đồ ăn nhanh", icon: "🍔", label: "Đồ ăn nhanh" },
  { value: "Ăn chay", icon: "🌿", label: "Ăn chay" },
  { value: "Hải sản", icon: "🦐", label: "Hải sản" },
  { value: "Xe đẩy", icon: "🛒", label: "Xe đẩy" },
  { value: "Quán nhậu", icon: "🍺", label: "Quán nhậu" },
  { value: "Buffet", icon: "🍱", label: "Buffet" },
] as const;

interface Props {
  specialtyDescription: string;
  openingHours: OpeningHoursDto[];
  tags: string[];
  errors: { specialtyDescription?: string; tags?: string };
  /** Hide the booth-type picker — use when stall type is rendered in a separate section. Defaults to true. */
  showTags?: boolean;
  onChange: (
    field: "specialtyDescription" | "openingHours" | "tags",
    value: string | OpeningHoursDto[] | string[]
  ) => void;
}

const MAX_SPECIALTY = 200;

export default function ShopSpecialtySection({
  specialtyDescription,
  openingHours,
  tags,
  errors,
  showTags = true,
  onChange,
}: Props) {
  // ── Opening hours helpers ──────────────────────────────────────────────────
  const updateHours = (day: number, key: keyof OpeningHoursDto, value: string | boolean) => {
    const updated = openingHours.map((h) =>
      h.day === day ? { ...h, [key]: value } : h
    );
    onChange("openingHours", updated);
  };

  const applyAllWeek = () => {
    const updated = openingHours.map((h) => ({
      ...h,
      open: "08:00",
      close: "22:00",
      closed: false,
    }));
    onChange("openingHours", updated);
  };

  const closeSunday = () => {
    const updated = openingHours.map((h) => ({
      ...h,
      closed: h.day === 6 ? true : h.closed,
    }));
    onChange("openingHours", updated);
  };

  return (
    <section className="space-y-6">
      {/* ── Specialty description ──────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả đặc sản{" "}
          <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
        </label>
        <textarea
          value={specialtyDescription}
          maxLength={MAX_SPECIALTY}
          rows={3}
          onChange={(e) => onChange("specialtyDescription", e.target.value)}
          placeholder="VD: Bún bò Huế nấu theo công thức gia truyền 3 đời…"
          className={`w-full px-3 py-2.5 rounded-xl border text-sm text-gray-900 bg-white
            placeholder-gray-400 resize-none focus:outline-none focus:ring-2
            focus:ring-orange-400 focus:border-transparent
            ${errors.specialtyDescription ? "border-red-400" : "border-gray-200"}`}
        />
        <div className="flex justify-between mt-1">
          {errors.specialtyDescription ? (
            <p className="text-xs text-red-500">{errors.specialtyDescription}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">
            {specialtyDescription.length}/{MAX_SPECIALTY}
          </span>
        </div>
      </div>

      {/* ── Opening hours ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">
            Giờ mở cửa{" "}
            <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
          </label>
          <button
            type="button"
            onClick={applyAllWeek}
            className="text-xs px-2.5 py-1 rounded-lg border border-orange-200 text-orange-600
              hover:bg-orange-50 transition"
          >
            Mở cả tuần
          </button>
          <button
            type="button"
            onClick={closeSunday}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500
              hover:bg-gray-50 transition"
          >
            Đóng Chủ Nhật
          </button>
        </div>

        <div className="space-y-2">
          {openingHours.map((h) => (
            <div
              key={h.day}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border
                ${h.closed ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"}`}
            >
              <span className="text-sm text-gray-700 w-20 flex-shrink-0">
                {DAY_LABELS[h.day]}
              </span>

              {h.closed ? (
                <span className="text-xs text-gray-400 italic">Đóng cửa</span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={h.open}
                    onChange={(e) => updateHours(h.day, "open", e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1
                      focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                  <span className="text-gray-400 text-xs">–</span>
                  <input
                    type="time"
                    value={h.close}
                    onChange={(e) => updateHours(h.day, "close", e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1
                      focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              )}

              <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={h.closed}
                  onChange={(e) => updateHours(h.day, "closed", e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-400 accent-orange-500"
                />
                <span className="text-xs text-gray-500">Đóng</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* ── Booth type ────────────────────────────────────────────────────── */}
      {showTags && <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Loại gian hàng{" "}
          <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {BOOTH_TYPES.map((type) => {
            const selected = tags[0] === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange("tags", selected ? [] : [type.value])}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left
                  transition
                  ${selected
                    ? "bg-orange-50 border-orange-400 text-orange-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                  }`}
              >
                <span className="text-xl leading-none flex-shrink-0">{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
        {errors.tags && (
          <p className="text-xs text-red-500 mt-2">{errors.tags}</p>
        )}
      </div>}
    </section>
  );
}
