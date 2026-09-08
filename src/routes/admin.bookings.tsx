import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { bookingApi } from "@/lib/admin-api";

const title = "Bookings — Mayor Beauty Place Admin";
const description = "Manage salon appointments and schedules.";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: bookingApi.bookings,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      bookingApi.updateBooking(id, { status }),
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => bookingApi.deleteBooking(id),
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bookings = data?.bookings ?? [];

  return (
    <AdminShell title="Bookings" description="Manage salon appointments and schedules.">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
        </div>
      ) : bookings.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl">No bookings yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bookings made on the Book A Service page appear here.
          </p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.full_name}</div>
                    <div className="text-xs text-muted-foreground">{b.email}</div>
                    {b.phone && (
                      <div className="text-xs text-muted-foreground">{b.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{b.service}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.category_name}</td>
                  <td className="px-4 py-3">
                    {b.preferred_date
                      ? new Date(b.preferred_date).toLocaleDateString()
                      : "—"}{" "}
                    {b.preferred_time ?? ""}
                  </td>
                  <td className="px-4 py-3">£{Number(b.price ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={b.status}
                      onChange={(e) =>
                        setStatus.mutate({ id: b.id, status: e.target.value })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs capitalize"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this booking?")) remove.mutate(b.id);
                      }}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-brand-red"
                      aria-label="Delete booking"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
