import { useState } from 'react';
import { createAccount, login, setData, familyCareSFDemo } from './accounts.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function flip(next) {
    if (busy) return;
    setErr('');
    setMode(next);
  }

  function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    setTimeout(() => {
      if (mode === 'signup') {
        const res = createAccount({ email, password: pw, name, company });
        if (res.error) { setErr(res.error); setBusy(false); return; }
        if (res.user.email === 'alex@familycaresf.com') {
          setData(res.user.id, familyCareSFDemo());
        }
        onAuth(res.user);
      } else {
        const res = login({ email, password: pw });
        if (res.error) { setErr(res.error); setBusy(false); return; }
        onAuth(res.user);
      }
      setBusy(false);
    }, 350);
  }

  const isUp = mode === 'signup';

  return (
    <div className="login fade-in">
      <div className="login__brand">
        <span className="login__brand-mark" />
        <span>IBT</span>
      </div>

      <div className="login__card">
        <div className="login__eyebrow">
          {isUp ? 'Create account' : 'Sign in'}
        </div>

        <h1 className="login__title">
          {isUp ? 'Open a new client account' : 'Sign in to IBT'}
        </h1>

        <p className="login__sub">
          {isUp
            ? 'Spin up a private dashboard. We’ll seed a starter outreach plan you can edit as we go.'
            : 'Sign in to view this period’s outreach, replies, and warm leads.'}
        </p>

        <form onSubmit={submit}>
          {isUp && (
            <>
              <div className="field">
                <label className="field__label" htmlFor="company">Company</label>
                <input id="company" className="field__input" type="text"
                  value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="Family Care SF" autoFocus />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="name">Name</label>
                <input id="name" className="field__input" type="text"
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Girsh" />
              </div>
            </>
          )}

          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input id="email" className="field__input" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus={!isUp} />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="pw">Password</label>
            <input id="pw" className="field__input" type="password"
              autoComplete={isUp ? 'new-password' : 'current-password'}
              value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder={isUp ? '6 characters minimum' : ''} />
          </div>

          <button type="submit" className="login__submit" disabled={busy}>
            {busy ? '…' : (isUp ? 'Create account' : 'Continue')}
          </button>

          {err && <div className="login__error">{err}</div>}

          <div className="login__hint">
            {isUp ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => flip('signin')} className="login__switch">Sign in</button>
              </>
            ) : (
              <>New to IBT?{' '}
                <button type="button" onClick={() => flip('signup')} className="login__switch">Create an account</button>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="login__foot">
        IBT · Outreach Operations
      </div>
    </div>
  );
}
