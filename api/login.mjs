import { authenticate, makeSessionToken, setSessionCookie } from "./_lib/auth.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  let user;
  try {
    user = await authenticate(email, password);
  } catch (e) {
    res.status(500).json({ error: "auth not configured" });
    return;
  }
  if (!user) {
    // Generic message; don't reveal whether the email exists.
    res.status(401).json({ error: "invalid email or password" });
    return;
  }
  setSessionCookie(res, makeSessionToken(user));
  res.status(200).json({ user: { email: user.email, name: user.name, company: user.company } });
}
