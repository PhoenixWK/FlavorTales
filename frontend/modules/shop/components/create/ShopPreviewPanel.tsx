"use client";

import { DAY_LABELS, ShopDraftState } from "@/modules/shop/types/shop";

interface Props {
  draft: ShopDraftState;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function ShopPreviewPanel({ draft, onBack, onSubmit, submitting }: Props) {
  const openDays = draft.openingHours.filter((h) => !h.closed);
  const closedDays = draft.openingHours.filter((h) => h.closed);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition font-medium"
        >
          ← Quay lại chỉnh sửa
        </button>
        <span className="text-xs bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 font-semibold px-3 py-1 rounded-full border border-orange-200">
          👁️ Xem trước
        </span>
      </div>

      {/* Preview card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Avatar */}
        {draft.avatarPreviewUrl && (
          <div className="relative w-full h-52 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.avatarPreviewUrl}
              alt="Ảnh đại diện gian hàng"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          {/* Name */}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {draft.name || <span className="text-gray-300">(Chưa đặt tên)</span>}
          </h2>

          {/* Tags */}
          {draft.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <Section title="Giới thiệu">
            {draft.description ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 [&_ul]:list-disc [&_ul]:pl-5"
                // The description is HTML authored by the vendor in a rich-text contentEditable.
                // It never comes from external/untrusted sources.
                dangerouslySetInnerHTML={{ __html: draft.description }}
              />
            ) : (
              <p className="text-gray-400 text-sm italic">Chưa có mô tả.</p>
            )}
          </Section>

          {/* Specialty */}
          {draft.specialtyDescription && (
            <Section title="Món đặc trưng">
              <p className="text-gray-700 text-sm">{draft.specialtyDescription}</p>
            </Section>
          )}

          {/* Additional images */}
          {draft.additionalPreviewUrls.length > 0 && (
            <Section title="Hình ảnh">
              <div className="flex flex-wrap gap-2">
                {draft.additionalPreviewUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Ảnh ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Opening hours */}
          <Section title="Giờ mở cửa">
            <div className="space-y-1">
              {openDays.map((h) => (
                <div key={h.day} className="flex items-center justify-between text-sm text-gray-700">
                  <span className="font-medium w-24">{DAY_LABELS[h.day]}</span>
                  <span>{h.open} – {h.close}</span>
                </div>
              ))}
              {closedDays.map((h) => (
                <div key={h.day} className="flex items-center justify-between text-sm text-gray-400">
                  <span className="font-medium w-24">{DAY_LABELS[h.day]}</span>
                  <span>Nghỉ</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Audio */}
          {(draft.viAudioUrl || draft.enAudioUrl) && (
            <Section title="Audio thuyết minh">
              <div className="space-y-3">
                {draft.viAudioUrl && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">🇻🇳 Tiếng Việt</p>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                      key={draft.viAudioUrl}
                      controls
                      src={
                        draft.viAudioUrl.startsWith("blob:")
                          ? draft.viAudioUrl
                          : `/api/audio/serve?url=${encodeURIComponent(draft.viAudioUrl)}`
                      }
                      className="w-full h-9"
                    />
                  </div>
                )}
                {draft.enAudioUrl && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">🇬🇧 Tiếng Anh</p>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                      key={draft.enAudioUrl}
                      controls
                      src={
                        draft.enAudioUrl.startsWith("blob:")
                          ? draft.enAudioUrl
                          : `/api/audio/serve?url=${encodeURIComponent(draft.enAudioUrl)}`
                      }
                      className="w-full h-9"
                    />
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200
            text-gray-700 hover:bg-gray-50 transition"
        >
          Quay lại chỉnh sửa
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm
            ${submitting
              ? "bg-orange-300 text-white cursor-wait"
              : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-orange-200"
            }`}
        >
          {submitting ? "Đang gửi…" : "🚀 Gửi kiểm duyệt"}
        </button>
      </div>
    </div>
  );
}
