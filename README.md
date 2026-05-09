# IBT Dashboard

Multi-tenant outreach dashboard. Shows referral-partner pipeline numbers
(contacted, replied, warm, meetings) per tenant, plus a recent-activity
feed and weekly trend.

Front-end is React + Vite, fully static. Each tenant's data is a JSON
snapshot at `public/data/<slug>.json`, written by the aggregator that
runs against the shared NAS Postgres.

## Local

```sh
npm install
npm run dev
```

Visits at `http://localhost:5173`. Sign up creates a localStorage account;
companies seeded with their tenant slug pull `public/data/<slug>.json` if
it exists.

## How data lands here

The data flow is:

```
sender (FCSF/bdr, FAI/bdr)
   ↓ writes per SENDER_CONTRACT
shared NAS Postgres (AUTOMATION-IBT/db)
   ↓ aggregator reads, rolls up per-tenant
public/data/<slug>.json
   ↓ committed + pushed
Vercel rebuild
   ↓ live dashboard
```

Aggregator usage:

```sh
cd ../aggregator
DATABASE_URL=postgres://… node aggregate.mjs --tenant familycaresf
git add ../dashboard/public/data/familycaresf.json
git commit -m "aggregate familycaresf $(date +%F)"
git push
```

## Deployment

Hosted on Vercel via GitHub integration. Pushing to `main` triggers a
rebuild; the static `dist/` is served from the edge.
