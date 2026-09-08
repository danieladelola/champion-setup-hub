import { getDb } from "./db.server";
import {
  DEFAULT_DURATION_MINUTES,
  isDayFullyBooked,
  timeToMinutes,
  unavailableSlots,
  type BusyRange,
} from "./availability";

/** Bookings in these states no longer hold their slot. */
const RELEASED_STATUSES = ["cancelled", "canceled", "declined", "no_show", "expired"];

function toBusyRanges(rows: readonly Record<string, unknown>[]): BusyRange[] {
  const ranges: BusyRange[] = [];
  for (const row of rows) {
    const start = timeToMinutes(row["preferred_time"] as string | null);
    if (start === null) continue;
    const duration = Number(row["duration_minutes"] ?? DEFAULT_DURATION_MINUTES);
    const length = Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_DURATION_MINUTES;
    ranges.push({ start, end: start + length });
  }
  return ranges;
}

/** Taken time ranges for one date (YYYY-MM-DD). */
export async function getBusyRangesForDate(date: string): Promise<BusyRange[]> {
  const sql = getDb();
  const rows = await sql`
    select preferred_time, duration_minutes
    from bookings
    where preferred_date = ${date}::date
      and preferred_time is not null
      and coalesce(status, '') <> all(${RELEASED_STATUSES})`;
  return toBusyRanges(rows as unknown as Record<string, unknown>[]);
}

export async function getDayAvailability(date: string, durationMinutes?: number) {
  const busy = await getBusyRangesForDate(date);
  return {
    date,
    busy,
    unavailable: unavailableSlots(busy, durationMinutes),
  };
}

/** Dates in the given month (YYYY-MM) where nothing is left to book. */
export async function getFullyBookedDates(month: string, durationMinutes?: number) {
  const sql = getDb();
  const rows = await sql`
    select to_char(preferred_date, 'YYYY-MM-DD') as day, preferred_time, duration_minutes
    from bookings
    where preferred_date is not null
      and preferred_time is not null
      and to_char(preferred_date, 'YYYY-MM') = ${month}
      and coalesce(status, '') <> all(${RELEASED_STATUSES})`;

  const byDay = new Map<string, Record<string, unknown>[]>();
  for (const row of rows as unknown as Record<string, unknown>[]) {
    const day = row["day"] as string;
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }

  const full: string[] = [];
  for (const [day, list] of byDay) {
    if (isDayFullyBooked(toBusyRanges(list), durationMinutes)) full.push(day);
  }
  return full.sort();
}

/** Returns true when the requested slot is still free. */
export async function isSlotAvailable(date: string, time: string, durationMinutes?: number) {
  const start = timeToMinutes(time);
  if (start === null) return false;
  const length =
    durationMinutes && durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MINUTES;
  const busy = await getBusyRangesForDate(date);
  return !busy.some((range) => start < range.end && start + length > range.start);
}
