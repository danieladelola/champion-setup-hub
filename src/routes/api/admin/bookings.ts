import { createFileRoute } from "@tanstack/react-router";

import { getAdminFromRequest, json } from "@/lib/auth.server";
import { getDb } from "@/lib/db.server";

export const Route = createFileRoute("/api/admin/bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await getAdminFromRequest(request);
          if (!admin) return json({ error: "Unauthorized" }, { status: 401 });
          const sql = getDb();
          const bookings = await sql`
            select id, full_name, email, phone, service, category_name, price,
                   duration_minutes, preferred_date, preferred_time, notes, status, created_at
            from bookings
            order by created_at desc
            limit 300`;
          return json({ bookings });
        } catch (error) {
          console.error("GET /api/admin/bookings failed", error);
          return json({ error: "Database unavailable" }, { status: 503 });
        }
      },
    },
  },
});
