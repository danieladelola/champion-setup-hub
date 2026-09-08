import { getDb } from "./db.server";
import type { bookingSchema } from "./services.server";
import type { z } from "zod";

export type BookingInput = z.infer<typeof bookingSchema>;

export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function bookingReference() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MBB-${stamp}-${rand}`;
}

/**
 * Creates a booking in `pending` / `unpaid` state. The price is always taken
 * from PostgreSQL, never from the browser.
 */
export async function createPendingBooking(input: BookingInput) {
  const sql = getDb();
  const rows = await sql`
    select s.id, s.name, s.price, s.duration_minutes, s.category_id, c.name as category_name
    from services s
    join service_categories c on c.id = s.category_id
    where s.id = ${input.service_id} and s.active = true and c.active = true
    limit 1`;
  const service = rows[0];
  if (!service) throw new BookingError("That service is no longer available.", 400);

  const price = Number(service["price"] ?? 0);

  let created: Record<string, unknown> | undefined;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const reference = bookingReference();
    const inserted = await sql`
      insert into bookings (booking_reference, full_name, email, phone, customer_name,
        customer_email, service, service_id, category_id, category_name, price,
        duration_minutes, preferred_date, preferred_time, notes, status, payment_status)
      values (${reference}, ${input.full_name}, ${input.email}, ${input.phone ?? null},
        ${input.full_name}, ${input.email}, ${service["name"] as string},
        ${service["id"] as string}, ${service["category_id"] as string},
        ${service["category_name"] as string}, ${price},
        ${service["duration_minutes"] as number}, ${input.preferred_date},
        ${input.preferred_time}, ${input.notes ?? null}, 'pending', 'unpaid')
      on conflict (booking_reference) do nothing
      returning *`;
    created = inserted[0];
  }
  if (!created) throw new BookingError("Could not create the booking. Please try again.", 500);

  return { booking: created, price, serviceName: service["name"] as string };
}

export async function attachBookingSession(bookingId: string, sessionId: string) {
  const sql = getDb();
  await sql`
    update bookings
    set payment_provider = 'stripe', stripe_session_id = ${sessionId}, updated_at = now()
    where id = ${bookingId}`;
}

/** Idempotently confirms a booking once Stripe reports the payment succeeded. */
export async function markBookingPaid(params: {
  sessionId: string;
  paymentIntentId: string | null;
  paymentMethod: string | null;
  reference?: string | null;
}) {
  const sql = getDb();
  const rows = await sql`
    update bookings
    set payment_status = 'paid',
        status = case when status = 'pending' then 'confirmed' else status end,
        payment_provider = 'stripe',
        payment_method = coalesce(${params.paymentMethod}, payment_method),
        stripe_session_id = coalesce(stripe_session_id, ${params.sessionId}),
        stripe_payment_intent_id = coalesce(${params.paymentIntentId}, stripe_payment_intent_id),
        paid_at = coalesce(paid_at, now()),
        updated_at = now()
    where (stripe_session_id = ${params.sessionId}
           or booking_reference = ${params.reference ?? null})
      and payment_status <> 'paid'
    returning id, booking_reference, status, payment_status`;
  return rows[0] ?? null;
}

/** Cancels a booking whose Stripe session expired or failed without payment. */
export async function expireBooking(sessionId: string) {
  const sql = getDb();
  await sql`
    update bookings
    set status = 'cancelled', updated_at = now()
    where stripe_session_id = ${sessionId} and payment_status = 'unpaid'`;
}

export async function getBookingByReference(reference: string) {
  const sql = getDb();
  const rows = await sql`
    select id, booking_reference, full_name, email, phone, service, category_name,
           price, duration_minutes, preferred_date, preferred_time, notes,
           status, payment_status, payment_method, created_at
    from bookings where booking_reference = ${reference} limit 1`;
  return rows[0] ?? null;
}
