import { useEffect, useState } from 'react';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';
import { fetchSession, fetchTenantSnapshot, logout } from './accounts.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await fetchSession();
      if (cancelled) return;
      if (u) {
        setUser(u);
        const d = await fetchTenantSnapshot();
        if (!cancelled) setData(d);
      }
      if (!cancelled) setBootstrapping(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleAuth(u) {
    setUser(u);
    const d = await fetchTenantSnapshot();
    setData(d);
  }
  async function handleLogout() {
    await logout();
    setUser(null);
    setData(null);
  }

  if (bootstrapping) return null;
  if (!user) return <Auth onAuth={handleAuth} />;
  if (!data) return null;
  return <Dashboard user={user} data={data} onLogout={handleLogout} />;
}
