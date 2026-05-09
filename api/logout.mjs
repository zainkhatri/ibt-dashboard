import { clearSessionCookie } from "./_lib/auth.mjs";

export default function handler(req, res) {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
