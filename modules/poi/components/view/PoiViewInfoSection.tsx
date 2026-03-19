import type { OpeningHourEntry } from "@/modules/shop/services/shopApi";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  description: string | null;
  featuredDish: string | null;
  openingHours: OpeningHourEntry[] | null;
  tags: string[] | null;
}

export default function PoiViewInfoSection({
  description,
  featuredDish,
  openingHours,
  tags,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Description */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Description</p>
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-20 leading-relaxed">
          {description ? description : <span className="text-gray-400">No description provided.</span>}
        </p>
      </div>

      {/* Featured dish */}
      {featuredDish && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Featured Dish</p>
          <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-9 text-center">
            {featuredDish}
          </p>
        </div>
      )}

      {/* Tags / Specialties */}
      {tags && tags.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Specialties</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-orange-50 text-orange-600 text-xs font-medium px-3 py-1 rounded-full border border-orange-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Opening hours */}
      {openingHours && openingHours.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Opening Hours</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-1">
            {openingHours.map((slot, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-700 max-w-xs">
                <span className="font-medium">
                  {typeof slot.day === "number" ? DAY_NAMES[slot.day] ?? slot.day : slot.day}
                </span>
                <span className={slot.closed ? "text-gray-400" : ""}>
                  {slot.closed ? "Closed" : `${slot.open} – ${slot.close}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
