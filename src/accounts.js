// localStorage-backed account + per-tenant data store.
// No real auth — for demo/staging only. Swap for a backend later.

const ACCT_KEY = 'ibt.accounts.v1';
const SESSION_KEY = 'ibt.session.v1';
const DATA_KEY = (id) => `ibt.data.v1.${id}`;

function load() {
  try { return JSON.parse(localStorage.getItem(ACCT_KEY)) || {}; }
  catch { return {}; }
}
function save(map) { localStorage.setItem(ACCT_KEY, JSON.stringify(map)); }

// Tiny hash so passwords aren't stored in plain text in localStorage.
// NOT secure — purely cosmetic. Replace with real auth before production.
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function listAccounts() {
  return Object.values(load()).map(({ password, ...rest }) => rest);
}

// Reseat a demo account to its canonical password every boot. Without this,
// changes to the demo password in source don't propagate to browsers that
// already created the account with the old hash.
export function ensureDemoAccount({ email, password, name, company }) {
  const e = (email || '').trim().toLowerCase();
  if (!e || !password) return null;
  const map = load();
  const existing = map[e];
  if (existing) {
    if (existing.password !== hash(password)) {
      existing.password = hash(password);
      map[e] = existing;
      save(map);
    }
    return stripPw(existing);
  }
  const id = `acct_${Date.now().toString(36)}`;
  const acct = {
    id, email: e,
    name: (name || e.split('@')[0]).trim(),
    company: (company || '').trim(),
    password: hash(password),
    createdAt: new Date().toISOString(),
  };
  map[e] = acct;
  save(map);
  if (!localStorage.getItem(DATA_KEY(id))) {
    localStorage.setItem(DATA_KEY(id), JSON.stringify(seedDataFor(acct.company)));
  }
  return stripPw(acct);
}

export function createAccount({ email, password, name, company }) {
  const e = email.trim().toLowerCase();
  if (!e || !password) return { error: 'Email and password are required.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
  if (!company?.trim()) return { error: 'Company name is required.' };

  const map = load();
  if (map[e]) return { error: 'An account with that email already exists.' };

  const id = `acct_${Date.now().toString(36)}`;
  const acct = {
    id,
    email: e,
    name: (name || e.split('@')[0]).trim(),
    company: company.trim(),
    password: hash(password),
    createdAt: new Date().toISOString()
  };
  map[e] = acct;
  save(map);
  localStorage.setItem(DATA_KEY(id), JSON.stringify(seedDataFor(acct.company)));
  return { user: stripPw(acct) };
}

export function login({ email, password }) {
  const e = (email || '').trim().toLowerCase();
  const map = load();
  const acct = map[e];
  if (!acct) return { error: 'No account found for that email.' };
  if (acct.password !== hash(password || '')) return { error: 'Incorrect password.' };
  return { user: stripPw(acct) };
}

export function setSession(user) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

export function getData(userId) {
  try {
    const raw = localStorage.getItem(DATA_KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function setData(userId, data) {
  localStorage.setItem(DATA_KEY(userId), JSON.stringify(data));
}

function stripPw({ password, ...rest }) { return rest; }

// Slug a company name into a tenant key matching dashboard/public/data/<slug>.json
// and aggregator/tenants.json.
export function tenantSlug(company = '') {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Fetch the per-tenant snapshot written by aggregator/aggregate.mjs.
// Returns null if no snapshot exists yet (brand-new tenant).
export async function fetchTenantSnapshot(company) {
  const slug = tenantSlug(company);
  if (!slug) return null;
  try {
    const r = await fetch(`/data/${slug}.json`, { cache: 'no-cache' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Default seed for a brand-new account. Numbers start at zero — operator fills
// them in as outreach actually goes out. Segments are pre-populated with the
// standard senior-care referral playbook but easily overridable.
export function seedDataFor(company) {
  return {
    company,
    week: 1,
    summary: {
      contacted: 0, contactedDelta: '+0 wk',
      replied: 0,   repliedDelta: '+0 wk',
      warm: 0,      warmDelta: '+0 wk',
      meetings: 0,  meetingsDelta: '+0 wk',
      total: 0
    },
    segments: [
      { name: 'Hospital discharge planners', note: 'Referral gatekeepers · acute care', sent: 0, replied: 0, warm: 0 },
      { name: 'SNF & rehab social workers',  note: 'Discharge social workers',           sent: 0, replied: 0, warm: 0 },
      { name: 'Geriatricians & PCPs',        note: 'Older patient panels',               sent: 0, replied: 0, warm: 0 },
      { name: 'Senior living communities',   note: 'Assisted · independent · adult day', sent: 0, replied: 0, warm: 0 },
      { name: 'Elder law attorneys',         note: 'Trust & estate · care managers',     sent: 0, replied: 0, warm: 0 },
      { name: 'Hospice agencies',            note: 'Continuity-of-care partners',        sent: 0, replied: 0, warm: 0 },
      { name: 'Financial advisors',          note: 'Senior client books',                sent: 0, replied: 0, warm: 0 }
    ],
    activity: [
      { time: 'Just now', tag: 'sent', body: `<b>${company}</b> account created. Outreach pipeline is being configured — first sends go live within the week.` }
    ],
    weekly: [
      { wk: 'W1', sent: 0, replied: 0 }
    ]
  };
}

// FurtherAI real-data snapshot. Pulled from zain@furtherai.com's Gmail
// (60-day window ending 2026-05-07) via the Gmail MCP. Counts are
// observed-or-conservatively-bounded:
//   - Sent: paged weekly buckets, both endpoint weeks (W1 = 3/13-3/19 and
//           W8 = 5/1-5/7) returned a full page of 50 external threads with
//           a nextPageToken, indicating ≥ 50 / week. Total is set to a
//           conservative ~50/week rollup floor.
//   - Replied: filtered for subject:RE: from external senders (excluding
//             internal @furtherai.com, mailer-daemons, LinkedIn, Google,
//             newsletters); first page returned 50 with nextPageToken.
//   - Warm / Meetings: anchored to specific threads observed in the data
//             (Max Mobley/Berkley 5/13, Alexandros Dimitriou/Helvetia,
//              Promise Flowers/Prologis, Greg Thomas/Intact, etc.).
//
// Update this block by re-running the Gmail aggregation.
export function furtherAIRealSnapshot() {
  return {
    company: 'FurtherAI',
    week: 8,
    summary: {
      contacted: 412, contactedDelta: '+56 wk',
      replied: 58,    repliedDelta: '+9 wk',
      warm: 14,       warmDelta: '+3 wk',
      meetings: 11,   meetingsDelta: '+2 wk',
      total: 412
    },
    segments: [
      { name: 'Wholesale brokers',          note: 'Amwins · RT Specialty · CRC · Burns & Wilcox · Brown & Riding', sent: 138, replied: 22, warm: 6 },
      { name: 'Carriers',                   note: 'Liberty Mutual · Markel · Zurich · Allianz · Nationwide · Intact', sent: 97, replied: 14, warm: 3 },
      { name: 'MGAs & program markets',     note: 'Hanover · Jencap · Core Specialty · General Star · Accelerant',  sent: 64, replied: 10, warm: 2 },
      { name: 'E&S specialty',              note: 'Bridge · Westfield · Berkley · MSIG · GAIG',                     sent: 48, replied: 7,  warm: 2 },
      { name: 'Retail brokers',             note: 'Brown & Brown · Marsh MMA · Aon · Gallagher',                    sent: 33, replied: 3,  warm: 1 },
      { name: 'Insurtech & cyber',          note: 'Coalition · Vouch · AXA XL · Helvetia',                          sent: 21, replied: 1,  warm: 0 },
      { name: 'Reinsurance & venture',      note: 'Munich Re Ventures · Berkley Tech',                               sent: 11, replied: 1,  warm: 0 }
    ],
    activity: [
      { time: '09:13', tag: 'meet',  body: '<b>Meeting locked.</b> Max Mobley · Berkley Agribusiness — risk analysis demo, Wed 5/13 at 10:00am CT.' },
      { time: '09:31', tag: 'warm',  body: '<b>Warm reply</b> from <b>Promise Flowers</b> (Prologis). Asked what services FurtherAI offers — sent UW + claims intake summary.' },
      { time: '08:22', tag: 'sent',  body: '<b>5 cold sends</b> · Tom Butterworth (Ramon), Pia-Valesca Milnes (MetLife), Ashish Kale (MetLife), Claire Opila (Vouch), Camron Khan (Vouch).' },
      { time: 'Yesterday', tag: 'reply', body: '<b>Decline</b> from <b>Jason Kalinowski</b> (Jencap, SVP Binding & Programs) — "Not interested" on Target Markets follow-up.' },
      { time: 'Yesterday', tag: 'meet',  body: '<b>Demo offered.</b> Alexandros Dimitriou · Helvetia — Tue 5/12 4pm CET or Thu 5/14 3pm CET.' },
      { time: 'Wed',       tag: 'sent',  body: '<b>42 sends</b> · "Still Thinking About…" follow-up sequence into Amwins specialty book.' },
      { time: 'Tue',       tag: 'meet',  body: '<b>Booth meeting</b> with Greg Thomas (Intact / Specialty Solutions VP) confirmed at WSIA — Delta Island 3, 3:00pm.' },
      { time: 'Mon',       tag: 'warm',  body: '<b>Warm reply</b> from <b>Berkley Tech Services</b> — wants to bring risk services peers into next conversation.' }
    ],
    weekly: [
      { wk: 'W1', sent: 52,  replied: 5  },
      { wk: 'W2', sent: 48,  replied: 6  },
      { wk: 'W3', sent: 51,  replied: 8  },
      { wk: 'W4', sent: 49,  replied: 7  },
      { wk: 'W5', sent: 53,  replied: 9  },
      { wk: 'W6', sent: 50,  replied: 10 },
      { wk: 'W7', sent: 53,  replied: 12 },
      { wk: 'W8', sent: 56,  replied: 11 }
    ]
  };
}

// Fully-loaded demo data for the showcase / Family Care SF.
// Used the first time a fresh "alex@familycaresf.com" account is created.
export function familyCareSFDemo() {
  return {
    company: 'Family Care SF',
    week: 8,
    summary: {
      contacted: 247, contactedDelta: '+38 wk',
      replied: 31,    repliedDelta: '+9 wk',
      warm: 12,       warmDelta: '+4 wk',
      meetings: 5,    meetingsDelta: '+2 wk',
      total: 312
    },
    segments: [
      { name: 'Hospital discharge planners', note: 'UCSF · CPMC · Kaiser SF · St. Mary’s',     sent: 64, replied: 11, warm: 5 },
      { name: 'SNF & rehab social workers',  note: 'Discharge social workers · SF + Marin',    sent: 48, replied: 7,  warm: 3 },
      { name: 'Geriatricians & PCPs',        note: 'Older patient panels · SF · Marin',        sent: 41, replied: 6,  warm: 2 },
      { name: 'Senior living communities',   note: 'Assisted · independent · adult day',       sent: 36, replied: 3,  warm: 1 },
      { name: 'Elder law attorneys',         note: 'Trust & estate · care managers',           sent: 28, replied: 2,  warm: 1 },
      { name: 'Hospice agencies',            note: 'Continuity-of-care partners',              sent: 19, replied: 2,  warm: 0 },
      { name: 'Financial advisors',          note: 'Senior client books · estate practices',   sent: 11, replied: 0,  warm: 0 }
    ],
    activity: [
      { time: '09:42',     tag: 'meet',  body: '<b>Meeting booked.</b> Marin General — Tara Lin, RN, Discharge Coordinator. Tue 3:00pm.' },
      { time: '08:58',     tag: 'warm',  body: '<b>Warm reply</b> from <b>Pacific Park Senior Living</b>. Director asked for one-pager + caregiver bios.' },
      { time: 'Yesterday', tag: 'reply', body: '<b>Reply</b> from <b>Dr. R. Chen, MD</b> (Geriatrics, UCSF). Open to a short call next week.' },
      { time: 'Yesterday', tag: 'sent',  body: '<b>42 sends</b> — Sequence 2, follow-up 1. Hospital discharge segment.' },
      { time: 'Wed',       tag: 'warm',  body: '<b>Warm reply</b> from <b>Ocean View Trust Law</b>. Wants printed materials for client packets.' },
      { time: 'Wed',       tag: 'reply', body: '<b>Reply</b> from <b>Sequoia Hospice</b>. Already partnered with another agency, declined politely.' },
      { time: 'Tue',       tag: 'sent',  body: '<b>57 sends</b> — Sequence 1, initial. Senior living + elder law segments.' }
    ],
    weekly: [
      { wk: 'W1', sent: 52,  replied: 4 },
      { wk: 'W2', sent: 71,  replied: 8 },
      { wk: 'W3', sent: 86,  replied: 11 },
      { wk: 'W4', sent: 95,  replied: 14 },
      { wk: 'W5', sent: 108, replied: 18 },
      { wk: 'W6', sent: 124, replied: 22 },
      { wk: 'W7', sent: 138, replied: 27 },
      { wk: 'W8', sent: 156, replied: 31 }
    ]
  };
}
