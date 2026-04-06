"use client";

const LANGUAGES = [
  "English",
  "Korean (한국어)",
  "Chinese (中文)",
  "Russian (Русский)",
  "Japanese (日本語)",
];

export default function PoiTranslationStep() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          Dịch thông tin POI
        </h3>
        <p className="text-sm text-gray-500">
          Sau khi hoàn tất, nội dung POI và gian hàng sẽ được tự động dịch sang các ngôn ngữ sau.
        </p>
      </div>

      <div className="space-y-3">
        {LANGUAGES.map((lang) => (
          <div
            key={lang}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50"
          >
            <span className="w-5 h-5 text-orange-400 shrink-0">🌐</span>
            <p className="text-sm font-medium text-gray-700">{lang}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
