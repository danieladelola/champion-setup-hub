import { createFileRoute } from "@tanstack/react-router";

import { getAdminFromRequest, json } from "@/lib/auth.server";
import { getDb } from "@/lib/db.server";
import { BOOKING_STATUSES } from "@/lib/services.server";

export const Route = createFileRoute("/api/admin/bookings/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const admin = await getAdminFromRequest(request).catch(() => null);
        if (!admin) return json({ error: "Unauthorized" }, { status: 401 });
        let body: { status?: string };
        try {
          body = (await request.json()) as { status?: string };
        } catch {
          return json({ error: "Invalid request" }, { status: 400 });
        }
        const status = body.status;
        if (!status || !(BOOKING_STATUSES as readonly string[]).includes(status)) {
          return json({ error: "Invalid status" }, { status: 400 });
        }
        const sql = getDb();
        const rows = await sql`
          update bookings set status = ${status} where id = ${params.id} returning *`;
        if (!rows[0]) return json({ error: "Not found" }, { status: 404 });
        return json({ booking: rows[0] });
      },
      DELETE: async ({ request, params }) => {
        const admin = await getAdminFromRequest(request).catch(() => null);
        if (!admin) return json({ error: "Unauthorized" }, { status: 401 });
        const sql = getDb();
        await sql`delete from bookings where id = ${params.id}`;
        return json({ ok: true });
      },
    },
  },
});
