# Intern Management System

Single-company intern management system.

- **Phase 1**: project setup, Prisma schema/migration, JWT auth (login + role
  middleware), the login page UI.
- **Phase 2**: Admin onboarding flow — CSV import of pending interns, mentor
  assignment + invite emails, mentor creation, and a live admin dashboard.
- **Phase 3**: Mentor panel — a mentor's dashboard, "My Interns" list, task
  assignment, and evaluations, all strictly scoped to the logged-in mentor's
  own interns.
- **Phase 4**: Intern panel — an intern's dashboard, task status updates,
  attendance check-in/out with a streak view, and read-only evaluations, all
  strictly scoped to the logged-in intern's own id.
- **Phase 5**: Polish — form validation across every form, a Forgot
  Password flow for all roles, responsive dashboards down to mobile width,
  loading states on every button that hits the API, and a
  [deployment guide](DEPLOYMENT.md) for Render/Railway + Vercel + Supabase/Neon.
- **Phase 6**: Admin mentor management (remove/reassign), task deliverable
  file uploads with mentor download, and an intern department field with
  admin-side reporting.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT
- Email: Nodemailer (falls back to console logging if SMTP isn't configured)

## Prerequisites

- Node.js 18+
- A PostgreSQL database (local install, or a free hosted instance like
  [Neon](https://neon.tech) or [Supabase](https://supabase.com))
  - If using Supabase, use the **session pooler** connection string
    (`aws-*.pooler.supabase.com:5432`), not the direct `db.*.supabase.co` host
    — the direct host is IPv6-only and unreachable from many networks.

## 1. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — any long random string
- `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the one
  admin account this seeds (there is no public signup endpoint by design)
- `FRONTEND_URL` — used to build invite links in emails (default
  `http://localhost:3000`)
- `SMTP_*` — optional. Leave `SMTP_HOST` blank to have invite emails logged to
  the backend console instead of sent, which is fine for local development.

Install dependencies, run the migration, and seed the admin:

```bash
npm install
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

The API starts on `http://localhost:5000`. `GET /health` should return
`{"status":"ok"}`.

## 2. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

The app starts on `http://localhost:3000` and redirects `/` to `/login`.

## 3. Log in

Log in with the admin credentials you set in `backend/.env`. You'll land on
`/dashboard/admin`.

## Admin onboarding flow (Phase 2)

1. **Add a mentor** — `/dashboard/admin/mentors/new`. Creates a `role=mentor`
   user with `status=invited` and sends (or logs) an invite email.
2. **Import interns** — `/dashboard/admin/pending-interns`. Upload a CSV with
   `name,email` columns (e.g. exported from a Google Form). Each valid, new
   row becomes a `role=intern`, `status=pending` user. Invalid rows,
   in-file duplicates, and existing emails are reported back and skipped.
3. **Accept a pending intern** — on the same page, click **Accept**, pick a
   mentor from the dropdown, and confirm. This sets `mentor_id`, flips
   `status` to `invited`, and sends the intern an invite email.
4. **Set password** — the invite email links to `/set-password?token=...`.
   Submitting a new password there sets `status=active` and logs the user in
   directly, landing them on their role's dashboard.
5. **Admin Dashboard** — `/dashboard/admin` shows total interns, total
   mentors, pending approvals, and a full interns table (name, mentor,
   status).

If `SMTP_HOST` isn't set, invite links are printed to the backend's console
output instead of emailed — copy the link from there to test the flow
yourself.

## Mentor panel (Phase 3)

1. **Mentor Dashboard** — `/dashboard/mentor` shows stat cards (my interns,
   open tasks, evaluations given) and a list of the mentor's own interns.
2. **My Interns** — `/dashboard/mentor/my-interns` lists each intern with
   their active task count and last attendance status.
3. **Assign Task** — `/dashboard/mentor/tasks/new`. Dropdown is populated
   only from the mentor's own interns; the created task's `assigned_by` is
   always the mentor's id from the verified JWT, never a client-supplied value.
4. **Give Evaluation** — `/dashboard/mentor/evaluations/new`. Same intern
   dropdown, a 1-5 rating, and a feedback box. `mentor_id` on the saved
   evaluation always comes from the JWT.

**Ownership enforcement**: every mentor route lives behind
`authenticate` + `authorize("mentor")`, and every read/write additionally
filters by `mentorId: req.user.sub` (see `getOwnedIntern` in
`backend/src/controllers/mentor.controller.ts`). Assigning a task or
evaluation to an intern id that isn't actually assigned to that mentor
returns `404 Intern not found` — the same response as a nonexistent id, so a
mentor can't distinguish "not yours" from "doesn't exist" by probing ids.

## Intern panel (Phase 4)

1. **Intern Dashboard** — `/dashboard/intern` shows a greeting, stat cards
   (tasks completed this month, attendance % this month, last evaluation
   score), an open-tasks list, an attendance streak strip, and the latest
   evaluation's feedback.
2. **My Tasks** — `/dashboard/intern/tasks` lists the intern's own tasks.
   They can move status between pending/in_progress/done via a dropdown;
   title, description, and due date are read-only (the status endpoint only
   accepts a `status` field, so nothing else can be changed even if sent).
3. **Attendance** — `/dashboard/intern/attendance`. **Check In** creates
   today's attendance record (or re-checks-in a day already on record);
   **Check Out** stamps `check_out_time` on it. Both are disabled once
   already done for the day. Shows a 7-day streak strip and the current
   consecutive-day streak.
4. **My Evaluations** — `/dashboard/intern/evaluations`, a read-only list of
   past ratings and feedback from their mentor.

**Ownership enforcement**: every intern route lives behind `authenticate` +
`authorize("intern")`, and every query additionally filters by
`assignedTo`/`internId: req.user.sub` (see `getOwnedTask` in
`backend/src/controllers/intern.controller.ts`). Updating a task status for
an id that isn't assigned to that intern returns `404 Task not found` —
verified by having one intern guess another intern's real task id.

## Polish (Phase 5)

- **Forgot password** — `/forgot-password` (linked from the login page) posts
  an email to `POST /api/auth/forgot-password`. The response is always the
  same generic message regardless of whether the email exists, so the
  endpoint can't be used to enumerate accounts. If it does exist, a new reset
  token is generated (reusing the same `invite_token` mechanism from Phase 2)
  and emailed via `sendPasswordResetEmail` — the link lands on the same
  `/set-password` page used for onboarding.
- **Form validation** — every form (login, forgot/reset password, add
  mentor, CSV import, accept-intern, assign task, give evaluation) validates
  required fields and email format client-side (`frontend/src/lib/validation.ts`)
  before hitting the API, with inline per-field error messages, on top of the
  server-side zod validation that was already there.
- **Loading states** — every button that triggers a request shows in-flight
  text (`Signing in...`, `Uploading...`, `Checking in...`, etc.) and disables
  itself while the request is out, including the intern task-status dropdown
  and the two attendance buttons (tracked separately so each shows its own
  state).
- **Responsive layout** — `DashboardShell` collapses its sidebar into a
  slide-in drawer with a hamburger toggle below the `sm` breakpoint; all
  stat-card grids stack to a single column and all data tables scroll
  horizontally instead of breaking layout on narrow screens.
- **Deployment** — see [DEPLOYMENT.md](DEPLOYMENT.md) for provisioning a
  hosted Postgres (Supabase/Neon), deploying the backend (Render/Railway),
  and deploying the frontend (Vercel).

## Phase 6

- **Manage Mentors** — `/dashboard/admin/mentors` lists every mentor with
  their current intern count. Expanding a row ("View interns") lets the
  admin reassign an intern to a different mentor (`PATCH
  /api/admin/interns/:id/reassign`). A mentor can only be removed (`DELETE
  /api/admin/mentors/:id`) once they have zero interns **and** no task or
  evaluation history — those rows have a required foreign key back to the
  mentor, so removing a mentor with history would either violate that
  constraint or silently delete the audit trail. The button is disabled
  client-side with an explanatory tooltip, and the backend enforces the same
  rule regardless.
- **Task file attachments** — on My Tasks, switching an intern's task to
  "Done" reveals an optional file picker before it actually submits (`POST
  /api/intern/tasks/:id/complete`, multipart). Files are stored on local
  disk (`backend/uploads/tasks/`, gitignored) via multer, named
  `<taskId>-<timestamp>-<original name>` to avoid collisions. Only the
  intern who owns the task and the mentor who assigned it can download the
  file (`GET /api/intern/tasks/:id/attachment` /
  `GET /api/mentor/tasks/:id/attachment`) — there's no public static route
  for the uploads folder, so a file can't be fetched by guessing a URL.
  The mentor sees the same download link in "My Assigned Tasks". See
  [DEPLOYMENT.md](DEPLOYMENT.md) for why this needs a persistent disk (or an
  object store) once actually deployed.
- **Department** — CSV import now accepts an optional `department` column
  (`backend/src/utils/csv.ts`), shown on both the Pending Interns and Admin
  Dashboard intern tables. The Admin Dashboard also shows an "Interns by
  Department" breakdown (bar per department, sorted by count) computed via
  `prisma.user.groupBy` in `GET /api/admin/stats`.

## AI-assisted document generation (Phase 7)

- **Generate Documents** — `/dashboard/admin/documents` lets an admin pick an
  accepted intern, a date, and an optional short description, then generate
  an offer letter or completion certificate as a PDF.
- The optional description is expanded into a polished paragraph via the
  Claude API (`backend/src/utils/anthropic.ts`, model `claude-sonnet-5`). If
  left blank, or if the API call fails for any reason (missing/invalid
  `ANTHROPIC_API_KEY`, no credit balance, network error), a generic default
  paragraph is used instead — document generation never hard-fails because
  of the AI step.
- PDFs are built with `pdfkit` (`backend/src/utils/pdf.ts`): a solid orange
  header bar carries the company name (read from the display name in
  `SMTP_FROM`), everything below is plain black-on-white formal document
  text, with a thin orange footer bar as the only other accent.
- `POST /api/admin/documents/generate` returns the PDF itself as the
  response body (for immediate preview/download) with the saved file's id in
  an `X-Document-Id` response header — CORS is configured to expose that
  header (`app.ts`). The file is also written to
  `backend/uploads/tasks/../documents/` (gitignored) so a follow-up `POST
  /api/admin/documents/:id/send` can attach the same PDF to an email via
  nodemailer without regenerating it. As with task attachments, this is
  local disk storage — see [DEPLOYMENT.md](DEPLOYMENT.md).
- Requires `ANTHROPIC_API_KEY` in `backend/.env` (get one at
  [console.anthropic.com](https://console.anthropic.com)); without it,
  generation still works, just always with the default paragraph.

## How auth works

- `POST /api/auth/login` verifies the password with bcrypt and returns a JWT
  containing `sub` (user id), `role`, `name`, `email`. Login is rejected if
  the account has no password yet (i.e. hasn't gone through `/set-password`).
- `backend/src/middleware/auth.middleware.ts` exposes `authenticate` (verifies
  the token) and `authorize(...roles)` (checks `req.user.role`).
- Every protected route reads the acting user's id from `req.user.sub` — the
  verified JWT payload — never from the request body/params/query. All
  `/api/admin/*` routes require `authenticate` + `authorize("admin")`.
- The frontend stores `{ token, user }` in `localStorage` after login and
  attaches `Authorization: Bearer <token>` on API calls (`frontend/src/lib/api.ts`).
  Each dashboard route (`/dashboard/{admin,mentor,intern}`) guards itself
  client-side via `useRequireRole`, redirecting to `/login` if there's no
  session or to the correct dashboard if the role doesn't match.

## Project structure

```
backend/
  prisma/schema.prisma   users (+ department, activatedAt, invite token fields),
                         tasks (+ attachment fields), attendance, evaluations
  prisma/seed.ts         creates the one admin account from .env
  uploads/tasks/          task deliverable files (gitignored, local disk storage)
  src/config             env, prisma client
  src/middleware         authenticate, authorize, error handling,
                         CSV upload + task-file upload (multer)
  src/controllers        auth.controller.ts (login, me, invite, set-password,
                         forgot-password, change-password)
                         admin.controller.ts (stats incl. byDepartment, interns, mentors
                         incl. remove/reassign, csv import, accept, attendance overview)
                         mentor.controller.ts (stats, my-interns, assign/list tasks,
                         evaluations, attendance check-in/out, attachment download)
                         intern.controller.ts (stats, tasks, complete-task-with-attachment,
                         attendance check-in/out, evaluations)
  src/routes              auth.routes.ts, admin.routes.ts, mentor.routes.ts, intern.routes.ts,
                         dashboard.routes.ts
  src/utils               jwt, mailer (invite + reset emails), invite tokens, csv parsing,
                         attendance.ts (shared check-in/out + % calc, used by intern + mentor),
                         HttpError + asyncHandler for consistent error responses
  src/app.ts, server.ts

frontend/
  src/app/login                          login page
  src/app/forgot-password                request a password reset email
  src/app/set-password                   public invite-token password setup (also used for resets)
  src/app/dashboard/admin                admin dashboard (stats, department breakdown,
                                         attendance overview, interns table)
  src/app/dashboard/admin/pending-interns CSV import + accept/reject-with-mentor flow
  src/app/dashboard/admin/mentors        manage mentors: intern counts, reassign, remove
  src/app/dashboard/admin/mentors/new    add mentor form
  src/app/dashboard/admin/profile        admin profile + change password
  src/app/dashboard/mentor               mentor dashboard (stats, check-in/out, interns list)
  src/app/dashboard/mentor/my-interns    intern list with task count, last attendance, attendance %
  src/app/dashboard/mentor/tasks/new     assign task form + assigned-task history + attachments
  src/app/dashboard/mentor/evaluations/new  give evaluation form + past evaluations
  src/app/dashboard/mentor/profile       mentor profile + change password
  src/app/dashboard/intern               intern dashboard (stats + tasks + streak + evaluation)
  src/app/dashboard/intern/tasks         task list, status dropdown, optional file on Done
  src/app/dashboard/intern/attendance    check-in/out + weekly streak
  src/app/dashboard/intern/evaluations   read-only evaluation history
  src/app/dashboard/intern/profile       intern profile (+ mentor name) + change password
  src/lib/auth.ts                        session storage helpers
  src/lib/api.ts                         fetch wrapper (JWT header), multipart upload helper,
                                         apiDownload (blob-based authenticated file download)
  src/lib/useRequireRole.ts              client-side route guard
  src/lib/validation.ts                  shared client-side field validation helpers
  src/components/DashboardShell.tsx      shared sidebar/layout, role-aware nav
  src/components/StatusBadge.tsx         pending/invited/active badge (users)
  src/components/TaskStatusBadge.tsx     pending/in_progress/done badge (tasks)
  src/components/AttendanceStreakStrip.tsx  7-day attendance strip, shared by dashboard + attendance page
  src/components/CircularProgress.tsx    hand-rolled SVG ring chart, used by attendance overview
  src/components/ProfileView.tsx         shared profile content + change-password form, all 3 roles
```
