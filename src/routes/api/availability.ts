import { createFileRoute } from "@tanstack/react-router";

import { json } from "@/lib/auth.server";
import { getDayAvailability, getFullyBookedDates } from "@/lib/availability.server";
import { TIME_SLOTS } from "@/lib/availability";
import { getDb } from "@/lib/db.server";

async function serviceDuration(serviceId: string | null) {
  if (!serviceId) return undefined;
  try {
    const sql = getDb();
    const rows = await sql`
      select duration_minutes from services where id = ${serviceId} limit 1`;
    const value = Number(rows[0]?.["duration_minutes"] ?? 0);
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/api/availability")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const date = url.searchParams.get("date");
        const month = url.searchParams.get("month");
        const serviceId = url.searchParams.get("service_id");

        try {
          const duration = await serviceDuration(serviceId);

          if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              return json({ error: "Invalid date" }, { status: 400 });
            }
            const day = await getDayAvailability(date, duration);
            return json({ ...day, slots: TIME_SLOTS });
          }

          if (month) {
            if (!/^\d{4}-\d{2}$/.test(month)) {
              return json({ error: "Invalid month" }, { status: 400 });
            }
            const fullyBooked = await getFullyBookedDates(month, duration);
            return json({ month, fully_booked: fullyBooked });
          }

          return json({ error: "Provide a date or month" }, { status: 400 });
        } catch (error) {
          console.error("GET /api/availability failed", error);
          return json({ error: "Could not load availability" }, { status: 500 });
        }
      },
    },
  },
});
