import { useEffect, useState } from 'react';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';
import {
  getSession, setSession, getData, seedDataFor, setData,
  createAccount, login, fetchTenantSnapshot, ensureDemoAccount,
} from './accounts.js';

// Demo bootstrap. URL param ?as=zain switches to FurtherAI; default = Alex/FCSF.
const DEMO_ACCOUNTS = {
  alex: { email: 'alex@familycaresf.com', password: 'goldengate', name: 'Alex Girsh',  company: 'Family Care SF' },
  zain: { email: 'zain@furtherai.com',    password: 'fai-demo',  name: 'Zain Khatri', company: 'FurtherAI'      },
};

function bootstrapDemo() {
  // Reseat both demo accounts every boot — keeps passwords in sync with source
  // even if a browser already created them with an older default.
  for (const acct of Object.values(DEMO_ACCOUNTS)) ensureDemoAccount(acct);
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const which = params?.get('as') === 'zain' ? 'zain' : 'alex';
  const acct = DEMO_ACCOUNTS[which];
  const res = login({ email: acct.email, password: acct.password });
  if (res.user) { setSession(res.user); return res.user; }
  return null;
}

export default function App() {
  const [user, setUser] = useState(() => getSession() || bootstrapDemo());
  const [data, setDataState] = useState(null);

  useEffect(() => {
    if (!user) { setDataState(null); return; }

    let cancelled = false;
    (async () => {
      // Source-of-truth ladder:
      //   1. /data/<slug>.json  — written by the aggregator (real, repeatable)
      //   2. localStorage cache — last-known data for this tenant
      //   3. seedDataFor(...)   — empty starter for brand-new tenants
      const remote = await fetchTenantSnapshot(user.company);
      if (cancelled) return;
      if (remote) {
        setData(user.id, remote);
        setDataState(remote);
        return;
      }
      const cached = getData(user.id);
      setDataState(cached || seedDataFor(user.company));
    })();

    return () => { cancelled = true; };
  }, [user]);

  function handleAuth(u) { setSession(u); setUser(u); }
  function handleLogout() { setSession(null); setUser(null); }

  if (!user || !data) return <Auth onAuth={handleAuth} />;
  return <Dashboard user={user} data={data} onLogout={handleLogout} />;
}
