// Lightweight auth for the IBT dashboard. No external deps — Node's crypto
// gives us scrypt (password hashing) and HMAC-SHA256 (session signing).
//
// Env vars (set in Vercel project settings):
//   AUTH_SECRET       — long random string (32+ chars) used to sign sessions
//   AUTH_USERS_JSON   — JSON object: { "<email>": { "hash": "<scrypt-hash>",
//                       "name": "...", "company": "...", "slug": "..." } }
//
// Generate AUTH_USERS_JSON entries with: `node scripts/hash-password.mjs`.

import crypto from "node:crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;        // 7 days
const COOKIE_NAME = "ibt_session";
const SCRYPT_KEY_LEN = 64;

function b64url(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET missing or too short (need 32+ chars)");
  }
  return s;
}

function loadUsers() {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) throw new Error("AUTH_USERS_JSON not set");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error("AUTH_USERS_JSON is not valid JSON");
  }
}

// scrypt password hash, formatted as `scrypt$<N>$<salt-b64url>$<key-b64url>`.
// We pin N=16384 (default). r=8, p=1.
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, SCRYPT_KEY_LEN, (err, derived) =>
      err ? reject(err) : resolve(derived)));
  return `scrypt$16384$${b64url(salt)}$${b64url(key)}`;
}

async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const salt = b64urlDecode(parts[2]);
  const want = b64urlDecode(parts[3]);
  const got = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, want.length, (err, derived) =>
      err ? reject(err) : resolve(derived)));
  if (got.length !== want.length) return false;
  return crypto.timingSafeEqual(got, want);
}

function sign(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSecret())
    .update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64url(sig)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = b64url(crypto.createHmac("sha256", getSecret())
    .update(`${h}.${p}`).digest());
  if (expected.length !== s.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) {
    return null;
  }
  let payload;
  try { payload = JSON.parse(b64urlDecode(p).toString("utf8")); }
  catch { return null; }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export async function authenticate(email, password) {
  const users = loadUsers();
  const u = users[email?.toLowerCase()];
  if (!u || !u.hash) return null;
  const ok = await verifyPassword(password, u.hash);
  if (!ok) return null;
  return {
    email: email.toLowerCase(),
    name: u.name || email,
    company: u.company || "",
    slug: u.slug || "",
  };
}

export function makeSessionToken(user) {
  return sign({
    email: user.email, name: user.name, company: user.company,
    slug: user.slug,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
}

export function readSession(req) {
  const cookie = req.headers?.cookie || "";
  const m = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  return verifyToken(decodeURIComponent(m[1]));
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; ` +
    `SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export { COOKIE_NAME };
