import { useState } from 'react';
import { login } from './accounts.js';

export default function Auth({ onAuth }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const res = await login({ email, password: pw });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    onAuth(res.user);
  }

  return (
    <div className="login fade-in">
      <div className="login__brand">
        <span className="login__brand-mark" />
        <span>IBT</span>
      </div>

      <div className="login__card">
        <div className="login__eyebrow">Sign in</div>

        <h1 className="login__title">Sign in to IBT</h1>

        <p className="login__sub">
          Sign in to view this period&rsquo;s outreach, replies, and warm leads.
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input id="email" className="field__input" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com" autoFocus />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="pw">Password</label>
            <input id="pw" className="field__input" type="password"
              autoComplete="current-password"
              value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>

          <button type="submit" className="login__submit" disabled={busy}>
            {busy ? '…' : 'Continue'}
          </button>

          {err && <div className="login__error">{err}</div>}
        </form>
      </div>

      <div className="login__foot">
        IBT &middot; Outreach Operations
      </div>
    </div>
  );
}
