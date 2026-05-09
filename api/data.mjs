// Protected per-tenant data endpoint. Reads the snapshot from
// `api/_data/<slug>.json` only after verifying the session cookie. The slug
// is taken from the session, NOT the query string — so a signed-in user
// can't fetch another tenant's data by changing the URL.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSession } from "./_lib/auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  const s = readSession(req);
  if (!s) { res.status(401).json({ error: "not signed in" }); return; }
  const slug = (s.slug || "").replace(/[^a-z0-9_-]/gi, "");
  if (!slug) { res.status(400).json({ error: "no slug in session" }); return; }

  const file = path.join(__dirname, "_data", `${slug}.json`);
  try {
    const buf = await fs.readFile(file, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(buf);
  } catch (e) {
    res.status(404).json({ error: "no snapshot for this tenant" });
  }
}
