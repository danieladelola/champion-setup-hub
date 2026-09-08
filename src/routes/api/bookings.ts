import { createFileRoute } from "@tanstack/react-router";

import { json } from "@/lib/auth.server";
import { getDb } from "@/lib/db.server";
import { bookingSchema } from "@/lib/services.server";
import { isSlotAvailable } from "@/lib/availability.server";

export const Route = createFileRoute("/api/bookings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid request" }, { status: 400 });
        }
        const parsed = bookingSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            { error: parsed.error.issues[0]?.message ?? "Invalid booking details" },
            { status: 400 },
          );
        }
        const b = parsed.data;
        try {
          const sql = getDb();
          const rows = await sql`
            select s.id, s.name, s.price, s.duration_minutes, s.category_id, c.name as category_name
            from services s
            join service_categories c on c.id = s.category_id
            where s.id = ${b.service_id} and s.active = true and c.active = true
            limit 1`;
          const service = rows[0];
          if (!service) return json({ error: "Service unavailable" }, { status: 400 });

          const free = await isSlotAvailable(
            b.preferred_date,
            b.preferred_time,
            Number(service["duration_minutes"] ?? 0),
          );
          if (!free) {
            return json(
              { error: "That time has just been booked. Please choose another time." },
              { status: 409 },
            );
          }

          const inserted = await sql`
            insert into bookings (full_name, email, phone, customer_name, customer_email,
              service, service_id, category_id,
              category_name, price, duration_minutes, preferred_date, preferred_time, notes, status)
            values (${b.full_name}, ${b.email}, ${b.phone ?? null}, ${b.full_name}, ${b.email},
              ${service["name"] as string},
              ${service["id"] as string}, ${service["category_id"] as string},
              ${service["category_name"] as string}, ${service["price"] as string},
              ${service["duration_minutes"] as number}, ${b.preferred_date}, ${b.preferred_time},
              ${b.notes ?? null}, 'pending')
            returning *`;
          return json({ booking: inserted[0] }, { status: 201 });
        } catch (error) {
          console.error("POST /api/bookings failed", error);
          return json({ error: "Could not create the booking" }, { status: 500 });
        }
      },
    },
  },
});
