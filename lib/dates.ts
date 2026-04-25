import { differenceInCalendarDays, format as dfFormat, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

export const MONTHS_RU_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export const MONTHS_RU_FULL = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

export const DOW_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** "24 апр" / "24 апреля" */
export function fmtDate(d: Date, { long = false }: { long?: boolean } = {}): string {
  const day = d.getDate();
  const m = d.getMonth();
  return `${day} ${long ? MONTHS_RU_FULL[m] : MONTHS_RU_SHORT[m]}`;
}

/** "апрель 2026" */
export function fmtMonthYear(d: Date): string {
  return `${MONTHS_RU_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14:32" */
export function fmtTime(d: Date): string {
  return dfFormat(d, "HH:mm", { locale: ru });
}

export function daysUntil(target: Date, from: Date = new Date()): number {
  return differenceInCalendarDays(startOfDay(target), startOfDay(from));
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
