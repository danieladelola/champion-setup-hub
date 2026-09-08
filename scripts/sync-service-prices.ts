/** Imports service prices and durations from the Bookly SQL export. */
import { readFileSync } from "node:fs";
import { getDb } from "../src/lib/db.server";

const file = process.argv[2] ?? "/mnt/user-uploads/wp_bookly_services.sql";
const dump = readFileSync(file, "utf8");
const rows = [...dump.matchAll(
  /^\((\d+), (?:\d+|NULL), '(?:simple|collaborative|compound|package)', '((?:[^'\\]|\\.)*)', (?:NULL|\d+), (\d+), 'default', ([\d.]+),/gm,
)];

const norm = (t: string) => t.replace(/\\'/g, "'").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const map = new Map<string, { price: number; dur: number }>();
for (const m of rows) {
  const price = Number(m[4]);
  const dur = Math.max(10, Math.round(Number(m[3]) / 60));
  if (price <= 0) continue;
  map.set(norm(m[2]!), { price, dur });
}

const sql = getDb();
const svc = await sql<{ id: string; name: string }[]>`select id, name from services`;
let updated = 0;
const missing: string[] = [];
for (const row of svc) {
  const hit = map.get(norm(row.name));
  if (!hit) { missing.push(row.name); continue; }
  await sql`update services set price = ${hit.price}, duration_minutes = ${hit.dur}, updated_at = now() where id = ${row.id}`;
  updated++;
}
console.log(JSON.stringify({ source: map.size, services: svc.length, updated, missing }, null, 1));
process.exit(0);
