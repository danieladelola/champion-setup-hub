import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";

const title = "Settings — Mayor Beauty Place Admin";
const description = "Configure store and salon preferences.";

export const Route = createFileRoute("/admin/settings")({
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
  return (
    <AdminShell title="Settings" description="Configure store and salon preferences.">
      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="font-display text-xl">Coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The settings module is not wired up yet.
        </p>
      </section>
    </AdminShell>
  );
}
