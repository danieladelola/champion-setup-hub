/**
 * Shared (client-safe) opening-hours and slot maths for the booking calendar.
 * The same helpers run in the browser (to grey out slots) and on the server
 * (to reject a double booking), so both always agree.
 */

export const SLOT_INTERVAL_MINUTES = 10;
export const OPEN_MINUTES = 11 * 60; // 11:00
export const CLOSE_MINUTES = 18 * 60; // 18:00

export const TIME_SLOTS: string[] = Array.from(
  { length: Math.floor((CLOSE_MINUTES - OPEN_MINUTES) / SLOT_INTERVAL_MINUTES) + 1 },
  (_, i) => minutesToTime(OPEN_MINUTES + i * SLOT_INTERVAL_MINUTES),
);

export function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timeToMinutes(time: string | null | undefined) {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return hours * 60 + mins;
}

export type BusyRange = { start: number; end: number };

export const DEFAULT_DURATION_MINUTES = 60;

/** Slots that overlap an existing appointment, given the new service length. */
export function unavailableSlots(
  busy: BusyRange[],
  durationMinutes = DEFAULT_DURATION_MINUTES,
): string[] {
  const length = durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MINUTES;
  return TIME_SLOTS.filter((slot) => {
    const start = timeToMinutes(slot)!;
    const end = start + length;
    return busy.some((range) => start < range.end && end > range.start);
  });
}

/** True when no slot at all is free on that day. */
export function isDayFullyBooked(busy: BusyRange[], durationMinutes?: number) {
  return unavailableSlots(busy, durationMinutes).length === TIME_SLOTS.length;
}
