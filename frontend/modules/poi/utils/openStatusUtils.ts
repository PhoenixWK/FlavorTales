import type { OpeningHoursDto } from "@/modules/poi/types/poi";
import { DAY_LABELS } from "@/modules/poi/types/poi";

// Leaflet runs in the browser so Date is always available.

/** Returns 0 = Mon … 6 = Sun, matching OpeningHoursDto.day. */
function getTodayIndex(): number {
  const jsDay = new Date().getDay(); // 0 = Sun … 6 = Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** "HH:mm" → total minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export interface OpenStatus {
  open: boolean;
  /** e.g. "Đang mở • Đóng lúc 22:00" or "Đã đóng • Mở lúc 08:00 Thứ Hai" */
  label: string;
}

export function getOpenStatus(hours: OpeningHoursDto[] | null | undefined): OpenStatus | null {
  if (!hours || hours.length === 0) return null;

  const todayIdx = getTodayIndex();
  const todayEntry = hours.find((h) => h.day === todayIdx);

  if (!todayEntry || todayEntry.closed) {
    // Find the next open day
    const nextOpen = findNextOpenDay(hours, todayIdx);
    return {
      open: false,
      label: nextOpen
        ? `Đã đóng • Mở lúc ${nextOpen.open} ${DAY_LABELS[nextOpen.day]}`
        : "Đã đóng hôm nay",
    };
  }

  const now = currentMinutes();
  const closeMin = toMinutes(todayEntry.close);
  const openMin = toMinutes(todayEntry.open);

  if (now >= openMin && now < closeMin) {
    return { open: true, label: `Đang mở • Đóng lúc ${todayEntry.close}` };
  }

  if (now < openMin) {
    return { open: false, label: `Đã đóng • Mở lúc ${todayEntry.open}` };
  }

  // Past close time — find the next open day
  const nextOpen = findNextOpenDay(hours, todayIdx);
  return {
    open: false,
    label: nextOpen
      ? `Đã đóng • Mở lúc ${nextOpen.open} ${DAY_LABELS[nextOpen.day]}`
      : "Đã đóng hôm nay",
  };
}

function findNextOpenDay(
  hours: OpeningHoursDto[],
  fromDayIdx: number
): OpeningHoursDto | null {
  for (let i = 1; i <= 7; i++) {
    const idx = (fromDayIdx + i) % 7;
    const entry = hours.find((h) => h.day === idx);
    if (entry && !entry.closed) return entry;
  }
  return null;
}
