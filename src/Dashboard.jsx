import { useState } from 'react';
import { useInView, useCountUp } from './hooks.js';

const WINDOW_LABELS = { day: 'Day', week: 'Week', month: 'Month', year: 'Year', all: 'All time' };
const WINDOW_KEYS   = ['day', 'week', 'month', 'year', 'all'];

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
}

function formatUpdated(iso) {
  if (!iso) return 'just now';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatCard({ label, value, delta, fillPct, idx }) {
  const [ref, inView] = useInView();
  const v = useCountUp(value, 1100, inView);
  const isFlat = !delta || /\+0\b/.test(delta);
  return (
    <div ref={ref} className={'stat reveal' + (inView ? ' in' : '')} style={{ '--d': `${idx * 60}ms` }}>
      <div className="stat__label">
        <span>{label}</span>
        <span className={'stat__delta' + (isFlat ? ' flat' : '')}>{delta}</span>
      </div>
      <div className="stat__num">{v.toLocaleString()}</div>
      <div className="stat__bar">
        <div
          className="stat__bar-fill"
          style={{
            transform: inView ? `scaleX(${Math.max(fillPct, 0.02)})` : 'scaleX(0)',
            transition: `transform 1s cubic-bezier(0.32,0.72,0,1) ${0.2 + idx * 0.06}s`
          }}
        />
      </div>
    </div>
  );
}

function Hero({ data, user }) {
  const empty = data.summary.total === 0;
  const total = useCountUp(data.summary.total, 1300, true);
  return (
    <section className="hero">
      <div className="hero__row">
        <div>
          <h1 className="hero__title fade-up" style={{ '--d': '40ms' }}>
            {empty ? `Welcome, ${user.name.split(' ')[0]}.` : `${total.toLocaleString()} conversations`}
          </h1>
          <p className="hero__sub fade-up" style={{ '--d': '120ms' }}>
            {empty
              ? 'Outreach mailbox is being provisioned. First sends go live within the week.'
              : `${data.summary.replied} replies · ${data.summary.warm} warm · ${data.summary.meetings} meetings booked.`}
          </p>
        </div>
        <div className="status fade-up" style={{ '--d': '180ms' }}>
          <span className={'status__dot' + (empty ? ' warming' : '')} />
          <span>{empty ? 'Setting up' : 'Live'}</span>
        </div>
      </div>
    </section>
  );
}

function WindowToggle({ value, onChange }) {
  return (
    <div className="window-toggle" role="tablist" aria-label="Time window">
      {WINDOW_KEYS.map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          className={'window-toggle__btn' + (value === k ? ' is-active' : '')}
          onClick={() => onChange(k)}
        >
          {WINDOW_LABELS[k]}
        </button>
      ))}
    </div>
  );
}

function statsForWindow(data, win) {
  if (win === 'all' || !data.windows) {
    const s = data.summary;
    return {
      contacted: s.contacted, replied: s.replied,
      warm: s.warm, meetings: s.meetings,
      contactedDelta: s.contactedDelta, repliedDelta: s.repliedDelta,
      warmDelta: s.warmDelta, meetingsDelta: s.meetingsDelta,
    };
  }
  const w = data.windows[win] || { contacted: 0, replied: 0, warm: 0, meetings: 0 };
  const tag = WINDOW_LABELS[win].toLowerCase();
  return {
    contacted: w.contacted, replied: w.replied,
    warm: w.warm, meetings: w.meetings,
    contactedDelta: `last ${tag}`, repliedDelta: `last ${tag}`,
    warmDelta: `last ${tag}`, meetingsDelta: `last ${tag}`,
  };
}

function Stats({ data, win }) {
  const s = statsForWindow(data, win);
  const max = Math.max(s.contacted, s.replied * 8, 100);
  return (
    <section className="stats">
      <StatCard idx={0} label="Contacted"        value={s.contacted} delta={s.contactedDelta} fillPct={s.contacted / max} />
      <StatCard idx={1} label="Replied"          value={s.replied}   delta={s.repliedDelta}   fillPct={(s.replied * 8) / max} />
      <StatCard idx={2} label="Warm leads"       value={s.warm}      delta={s.warmDelta}      fillPct={(s.warm * 14) / max} />
      <StatCard idx={3} label="Meetings booked"  value={s.meetings}  delta={s.meetingsDelta}  fillPct={(s.meetings * 20) / max} />
    </section>
  );
}

function Segment({ s, idx, sentMax }) {
  const [ref, inView] = useInView();
  const sentPct = sentMax > 0 ? (s.sent / sentMax) * 100 : 0;
  const warmPct = sentMax > 0 ? (s.warm / sentMax) * 100 : 0;
  return (
    <div ref={ref} className={'segment reveal' + (inView ? ' in' : '')} style={{ '--d': `${idx * 45}ms` }}>
      <div className="segment__no">{String(idx + 1).padStart(2, '0')}</div>
      <div className="segment__name">
        {s.name}
        <small>{s.note}</small>
      </div>
      <div className="segment__bar">
        <div
          className="segment__bar-sent"
          style={{
            width: inView ? `${sentPct}%` : '0%',
            transition: `width 0.9s cubic-bezier(0.32,0.72,0,1) ${0.2 + idx * 0.05}s`
          }}
        />
        <div
          className="segment__bar-warm"
          style={{
            width: inView ? `${warmPct}%` : '0%',
            transition: `width 0.9s cubic-bezier(0.32,0.72,0,1) ${0.4 + idx * 0.05}s`
          }}
        />
      </div>
      <div className="segment__nums">
        <span><b>{s.sent}</b></span>
        <span><b>{s.replied}</b></span>
        <span className="warm"><b>{s.warm}</b></span>
      </div>
    </div>
  );
}

function Segments({ data }) {
  const sentMax = Math.max(...data.segments.map((x) => x.sent), 0);
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="section__title">By segment</h2>
        <span className="section__meta">SENT · REPLIED · WARM</span>
      </div>
      <div className="card__body">
        {data.segments.map((s, i) => (
          <Segment key={s.name} s={s} idx={i} sentMax={sentMax} />
        ))}
      </div>
    </section>
  );
}

const FEED_TAG = { meet: 'Meeting', warm: 'Warm', reply: 'Reply', sent: 'Sent' };

function FeedRow({ a, idx }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={'feed__row reveal' + (inView ? ' in' : '')} style={{ '--d': `${idx * 40}ms` }}>
      <span className={`feed__dot ${a.tag}`} />
      <div>
        <div className="feed__body" dangerouslySetInnerHTML={{ __html: a.body }} />
        <div className="feed__meta">
          <span className={`feed__tag ${a.tag}`}>{FEED_TAG[a.tag] || '—'}</span>
          <span>·</span>
          <span>{a.time}</span>
        </div>
      </div>
    </div>
  );
}

function Feed({ data }) {
  return (
    <section className="card">
      <div className="card__head">
        <h2 className="section__title">Recent activity</h2>
        <span className="section__meta">7D</span>
      </div>
      <div className="card__body">
        {data.activity.length === 0 ? (
          <div className="feed__empty">No activity yet — first events will appear once outreach starts.</div>
        ) : data.activity.map((a, i) => <FeedRow key={i} a={a} idx={i} />)}
      </div>
    </section>
  );
}

function Chart({ data }) {
  const [ref, inView] = useInView({ rootMargin: '0px 0px -10% 0px' });
  const weekly = data.weekly.length > 1 ? data.weekly : [...data.weekly, { wk: 'W2', sent: 0, replied: 0 }];

  const W = 800, H = 200, P = 24, BOTTOM = 24;
  const innerW = W - 2 * P;
  const innerH = H - P - BOTTOM;
  const xs = weekly.map((_, i) => P + (i * innerW) / Math.max(weekly.length - 1, 1));
  const maxSent = Math.max(...weekly.map((d) => d.sent), 10);
  const yScale = (v) => P + innerH - (v / maxSent) * innerH;

  // Smooth curve
  function smooth(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  const sentPts    = weekly.map((d, i) => [xs[i], yScale(d.sent)]);
  const repliedPts = weekly.map((d, i) => [xs[i], yScale(d.replied * 5)]);
  const sentPath    = smooth(sentPts);
  const repliedPath = smooth(repliedPts);
  const sentArea    = sentPath + ` L ${xs[xs.length - 1]} ${P + innerH} L ${xs[0]} ${P + innerH} Z`;
  const len = 1500;

  return (
    <section className="card chart-card" ref={ref}>
      <div className="card__head">
        <h2 className="section__title">Pace over time</h2>
        <span className="section__meta">{weekly.length}W · SENT · REPLIES</span>
      </div>
      <div className="chart-wrap">
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[0, 0.33, 0.66].map((t, i) => (
            <line key={i} x1={P} x2={W - P}
                  y1={P + t * innerH} y2={P + t * innerH}
                  stroke="#EAEAEA" strokeWidth="1" />
          ))}

          <path d={sentArea} fill="rgba(0,0,0,0.04)"
            style={{ opacity: inView ? 1 : 0, transition: 'opacity 1s ease 0.3s' }} />

          <path d={sentPath} fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray={len}
            style={{
              strokeDashoffset: inView ? 0 : len,
              transition: 'stroke-dashoffset 1.4s cubic-bezier(0.32,0.72,0,1)'
            }} />

          <path d={repliedPath} fill="none" stroke="#A3A3A3" strokeWidth="1.2" strokeDasharray="3 4" strokeLinecap="round"
            style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.9s ease 0.6s' }} />

          {weekly.map((d, i) => (
            <circle key={i} cx={xs[i]} cy={yScale(d.sent)} r="3"
              fill="#FFF" stroke="#000" strokeWidth="1.4"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(0)',
                transformOrigin: `${xs[i]}px ${yScale(d.sent)}px`,
                transition: `opacity 0.4s ease ${0.9 + i * 0.05}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.9 + i * 0.05}s`
              }} />
          ))}

          {weekly.map((d, i) => (
            <text key={`t${i}`} x={xs[i]} y={H - 6} textAnchor="middle"
                  fontFamily="Geist Mono, monospace" fontSize="10" fill="#A3A3A3">
              {d.wk}
            </text>
          ))}
        </svg>
        <div className="chart-legend">
          <span><i /> Contacts sent</span>
          <span><i className="muted" /> Replies (×5)</span>
        </div>
      </div>
    </section>
  );
}

function Friday() {
  const [ref, inView] = useInView();
  const now = new Date();
  const day = now.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  const fri = new Date(now); fri.setDate(now.getDate() + diff);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <section ref={ref} className={'friday reveal' + (inView ? ' in' : '')}>
      <div className="friday__date">
        <span className="friday__day">Friday</span>
        <span className="friday__num">{String(fri.getDate()).padStart(2, '0')}</span>
        <span className="friday__mon">{months[fri.getMonth()]} {fri.getFullYear()}</span>
      </div>
      <div>
        <h3 className="friday__title">Weekly report drops Friday</h3>
        <p className="friday__sub">A one-page summary at 9:00 AM PT — what shipped, who replied, who looks warm, and the recommended next move.</p>
      </div>
      <a className="friday__cta" href="#">
        Preview last week
        <span className="arrow" aria-hidden>→</span>
      </a>
    </section>
  );
}

export default function Dashboard({ user, data, onLogout }) {
  const [win, setWin] = useState('week');
  return (
    <div className="dash fade-in">
      <header className="dash__top">
        <div className="dash__top-inner">
          <div className="dash__brand">
            <span className="dash__brand-mark" />
            <span className="dash__brand-name">IBT</span>
            <span className="dash__brand-divider" />
            <span style={{ color: 'var(--ink-3)' }}>{user.company}</span>
            <span className="dash__brand-tag">Outreach</span>
          </div>
          <div className="dash__user">
            <span className="dash__user-name">{user.name}</span>
            <button className="dash__logout" onClick={onLogout}>Sign out</button>
            <div className="dash__avatar">{initials(user.name)}</div>
          </div>
        </div>
      </header>

      <main className="dash__main">
        <Hero data={data} user={user} />
        <WindowToggle value={win} onChange={setWin} />
        <Stats data={data} win={win} />

        <Feed data={data} />

        <Chart data={data} />
        <Friday />

        <footer className="dash__foot">
          <span><b>Updated</b> {formatUpdated(data.updatedAt)} · synced from outreach mailbox</span>
          <span><b>IBT</b> · Operated by Z. Khatri</span>
        </footer>
      </main>
    </div>
  );
}
