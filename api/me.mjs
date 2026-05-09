import { readSession } from "./_lib/auth.mjs";

export default function handler(req, res) {
  const s = readSession(req);
  if (!s) { res.status(401).json({ error: "not signed in" }); return; }
  res.status(200).json({ user: { email: s.email, name: s.name, company: s.company } });
}
