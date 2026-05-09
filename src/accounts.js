// Thin client-side wrapper around the auth + data API. All real auth
// (passwords, sessions, signed cookies) lives in /api/* serverless functions.
// This file used to be a localStorage-backed fake; the dashboard is now
// behind a real signed-cookie session.

export async function login({ email, password }) {
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin',
  });
  if (r.ok) {
    const { user } = await r.json();
    return { user };
  }
  let msg = 'Sign-in failed.';
  try { const j = await r.json(); msg = j.error || msg; } catch {}
  return { error: msg };
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
}

export async function fetchSession() {
  try {
    const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) return null;
    const { user } = await r.json();
    return user;
  } catch {
    return null;
  }
}

export async function fetchTenantSnapshot() {
  try {
    const r = await fetch('/api/data', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
