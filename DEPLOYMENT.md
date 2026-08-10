# Deployment Guide

Three pieces to deploy, in this order (each step needs the previous one's URL):

1. **Database** — hosted PostgreSQL (Supabase or Neon)
2. **Backend** — Render or Railway
3. **Frontend** — Vercel

## 1. Hosted PostgreSQL

### Option A — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection String**.
3. Use the **Session pooler** connection string (host like
   `aws-<region>.pooler.supabase.com`, port `5432`), **not** the direct
   `db.<ref>.supabase.co` host. The direct host is IPv6-only and many
   networks and hosting platforms can't reach it — this bit us during local
   development too. The pooler connection works over IPv4 and is fine for
   Prisma in session mode.
4. Copy the full URI (it already includes your password) — this is your
   `DATABASE_URL`.

### Option B — Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string shown on the project dashboard (includes
   `?sslmode=require`) — this is your `DATABASE_URL`.

Either way, keep this connection string handy for the backend deploy step.

## 2. Backend

### Option A — Render

1. Push this repo to GitHub (if it isn't already there).
2. In the [Render dashboard](https://dashboard.render.com), click **New →
   Web Service** and connect the repo.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
     (running the migration on every boot is safe — it's a no-op once
     the schema is already up to date — and means you never forget to
     migrate after a schema change)
4. Add environment variables (Render's **Environment** tab):
   - `DATABASE_URL` — from step 1
   - `JWT_SECRET` — a long random string (generate one with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `JWT_EXPIRES_IN` — `1d`
   - `NODE_ENV` — `production`
   - `CORS_ORIGIN` — placeholder for now, e.g. `http://localhost:3000`
     (you'll update this after deploying the frontend in step 3)
   - `FRONTEND_URL` — same placeholder, updated in the same step
   - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — for the seed script
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — leave
     `SMTP_HOST` blank to have invite/reset emails logged to Render's log
     output instead of sent, or fill these in with a real provider (Gmail
     App Password, SendGrid, Mailgun, etc.)
   - `ANTHROPIC_API_KEY` — leave blank to always fall back to the generic
     default paragraph on generated documents, or set a real key from
     [console.anthropic.com](https://console.anthropic.com)
   - Render sets `PORT` automatically — you don't need to add it.
5. Deploy. Once live, note the public URL, e.g.
   `https://intern-management-backend.onrender.com`.
6. Seed the admin account once: open the **Shell** tab on the service and
   run `npm run seed`.
7. Verify: `curl https://<your-backend>.onrender.com/health` should return
   `{"status":"ok"}`.

> Free-tier Render services spin down when idle and take ~30-60s to wake on
> the next request — expect a slow first load after inactivity.

### Option B — Railway

1. In [Railway](https://railway.app), click **New Project → Deploy from
   GitHub repo** and select this repo.
2. In the service settings, set **Root Directory** to `backend`.
3. Set **Build Command** to `npm install && npm run build` and **Start
   Command** to `npx prisma migrate deploy && npm start`.
4. Add the same environment variables listed above under **Variables**.
5. Click **Settings → Networking → Generate Domain** to get a public URL.
6. Seed the admin account once, either via the **Shell** in the Railway
   dashboard, or locally with the Railway CLI: `railway run npm run seed`.
7. Verify `/health` the same way as above.

## 3. Frontend — Vercel

1. In [Vercel](https://vercel.com), click **Add New → Project** and import
   the same repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Next.js — leave
   the build/output settings as default.
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` — your backend's public URL from step 2 (e.g.
     `https://intern-management-backend.onrender.com`), **no trailing
     slash**
4. Deploy. Note the assigned URL, e.g.
   `https://intern-management-system.vercel.app`.

## 4. Wire the two together

The backend needs to know the frontend's real URL for CORS and for building
invite/reset links in emails:

1. Back in Render/Railway, update the backend's environment variables:
   - `CORS_ORIGIN` → your Vercel URL (e.g.
     `https://intern-management-system.vercel.app`)
   - `FRONTEND_URL` → the same URL
2. Redeploy the backend so the new env vars take effect.

## 5. Smoke test in production

1. Visit your Vercel URL — it should redirect to `/login`.
2. Log in with the admin credentials you set via `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
3. Create a mentor, import an intern via CSV, accept them, and check the
   invite email (or the backend's log output if `SMTP_HOST` is unset) for a
   working `/set-password` link pointing at your Vercel URL.
4. Confirm login, dashboards, and role redirects all work end-to-end.

## Troubleshooting

- **CORS errors in the browser console**: `CORS_ORIGIN` on the backend
  doesn't match the frontend's actual URL (check for trailing slashes,
  `http` vs `https`, or a preview-deployment URL that isn't in the list).
  `CORS_ORIGIN` accepts a comma-separated list if you need to allow more
  than one origin.
- **`P1001: Can't reach database server`**: you're using Supabase's direct
  `db.*.supabase.co` host instead of the session pooler host — see step 1.
- **Invite/reset emails never arrive**: check `SMTP_HOST` is set correctly,
  or check the backend's logs — with `SMTP_HOST` blank, emails are logged
  instead of sent, which is easy to forget once you've moved to production.
- **Prisma errors about pending migrations**: make sure the start command
  includes `npx prisma migrate deploy` (not `migrate dev`, which is
  interactive and not meant for production).
- **Task attachments disappear after a redeploy**: task deliverables (Phase
  6) are stored on local disk at `backend/uploads/tasks/`. Render and
  Railway's default filesystem is **ephemeral** — it's wiped on every deploy
  and, on Render's free tier, on every restart. For anything beyond a demo,
  either add a persistent disk (Render: **Disks** in the service settings,
  mount it at `/opt/render/project/src/backend/uploads`) or switch the
  storage in `backend/src/middleware/upload.middleware.ts` to an object
  store (e.g. Supabase Storage, S3). Generated offer letters/certificates
  (Phase 7) live at `backend/uploads/documents/` and have the same caveat.
- **Generated documents always use the generic default paragraph**: check
  `ANTHROPIC_API_KEY` is set in the backend's environment and that the key's
  account has an available credit balance — the backend logs the specific
  Claude API error (missing key, invalid key, no credits, etc.) whenever it
  falls back, so check the backend logs first.
