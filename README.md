# CareerHub

A career platform: job discovery & matching, skill-gap analysis, learning paths, mock
interview training, skill assessments, applications, company intelligence, career planning,
and recruiter tooling.

```
career-hub/
├── backend/    Express + MongoDB API (see backend/README.md)
└── frontend/   React + Vite web app (see frontend/README.md)
```

## Quick start

Requires Node 18+ (the backend's LLM integration uses the built-in `fetch`) and a running
MongoDB instance.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # fill in MONGO_URI and JWT_SECRET at minimum
npm run seed                # creates a candidate, recruiter, and admin account + a sample job
npm run dev                 # http://localhost:5000

# 2. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL should point at the backend above
npm run dev                 # http://localhost:5173
```

Seeded logins (from `npm run seed`):

| Role      | Email                      | Password      |
|-----------|-----------------------------|---------------|
| Candidate | jamie@example.com          | password123   |
| Recruiter | recruiter@acmerobotics.com | password123   |
| Admin     | admin@careerhub.local          | password123   |


## Email verification & SMTP setup

1. In `backend/.env` set `CLIENT_URL=http://localhost:5173` (where the frontend runs) and `ALLOWED_ORIGINS=http://localhost:5173`.
2. Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Gmail needs a 16-character **App Password**, see `backend/.env.example`).
3. Run `cd backend && npm run test-email -- you@example.com`. It checks the connection and sends a test mail, and prints a hint if something is wrong.
4. Start the API. On startup it logs `[mail] SMTP connection OK` or the exact failure reason.

With SMTP left blank, no mail is sent; the verification / reset **link is printed in the backend console** so you can still test the flow.
Users who did not get the mail can press **Resend verification email** on the dashboard or the verify page (`POST /api/auth/resend-verification`). Links expire after 24 hours.

## Changing the product name

The name is `CareerHub` by default. Set `APP_NAME` in `backend/.env` (emails) and `VITE_APP_NAME` in `frontend/.env` (UI), and replace `frontend/public/logo.svg` and `favicon.svg` with your own logo.

## What was checked in this pass

The backend was reviewed against an earlier code-review report and the following were fixed:

- **Authorization**: recruiters could edit/delete any job, or change the status of any
  application, not just their own. Now checked against `Job.postedBy` and
  `Company.recruiters`.
- **Assessment scoring**: candidates could submit their own score and instantly get a
  verified skill. Submissions are now `pending` until an admin grades them via a new
  grading-queue endpoint.
- **Email verification**: the token was generated but never sent; the welcome email now
  includes the verification link, and the frontend has a page to complete it.
- **LLM integration**: `callLLM` now actually calls Anthropic or OpenAI (whichever key is
  configured) instead of throwing.
- **Input validation**: added validators for course/assessment/company creation instead of
  passing `req.body` straight into `.create()`.
- **Regex injection / ReDoS**: user-supplied text going into `new RegExp(...)` (job country
  filter, skill filters, career-planner target roles) is now escaped.
- **Unbounded pagination**: `limit` query params are now clamped everywhere they were open-ended.
- **Interview-answer race condition**: concurrent answer submissions could corrupt a
  session's question sequence; the append is now an atomic compare-and-swap.
- **Continuous-matching cron job**: running on every API instance would duplicate work and
  notifications at scale; it's now coordinated with a short-lived Mongo-backed lock.
- **Missing "review applications" capability**: recruiters had no endpoint to list applicants
  for their own postings (only per-application-ID access). Added `GET /api/jobs/mine` and
  `GET /api/applications?jobId=`, and wired the frontend's recruiter dashboard to them.

The frontend was audited page-by-page against the backend's actual request/response shapes.
Two gaps were found and fixed:
- The email-verification link had nowhere to land (`VerifyEmail.jsx` + route added).
- There was no UI at all for skill assessments (`Assessments.jsx` added — candidate
  submission + admin grading queue).

## Known limitations (by design, not oversights)

- **Assessment grading is manual.** There's no automated grader (unit-test runner, rubric
  LLM grading) — every submission needs a human to assign a score via the admin grading
  queue. This was a deliberate trade for correctness: the previous behavior (candidate
  self-reports the score) was worse than requiring a human in the loop.
- **Matching is O(candidates × jobs)** and fine at small/medium scale; swap in a vector/ANN
  index (Elasticsearch, pgvector, a managed vector DB) before it becomes a bottleneck.
- **AI features need a provider key.** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in the
  backend `.env` unlocks resume tailoring, freeform mock interviews, and richer interview
  feedback. Interview practice, matching, and skill-gap analysis all work with zero
  configuration via heuristic scoring.
- **Networking suggestions and company hiring-trend data are contract-only** — real versions
  need a consented professional-network API and a real data pipeline, respectively.
- Neither the frontend nor backend has been run in this environment (no network access to
  install dependencies) — both were checked by static review (`node --check` on every backend
  file; manual JSX/contract review on the frontend), not by an actual build or test run. Do a
  real `npm install` + smoke test on both before deploying.

## Auth flow between the two apps

The backend signs a JWT on login/register; the frontend stores it in `localStorage` and
attaches it as `Authorization: Bearer <token>` on every request (see
`frontend/src/lib/apiClient.js`). A 401 response clears the stored session and the app
redirects to `/login`. Password-reset and email-verification links point at
`CLIENT_URL` (backend env var) and are handled by the frontend's `/reset-password` and
`/verify-email` routes — make sure `CLIENT_URL` in `backend/.env` matches wherever the
frontend is actually served.

## Resume upload, company matching & auto-apply

Candidate page: `/resume` (sidebar → **Resume**).

- `POST /api/resume` (multipart field `resume`; PDF/DOCX/TXT, ≤5 MB) extracts text, detects skills/experience, and returns companies ranked by best-matching open role. The original file is not stored, only extracted text and parsed fields on the user.
- `GET /api/resume` returns the resume summary, auto-apply settings, fresh company matches, and recent auto-applications.
- `PATCH /api/resume/auto-apply` `{ enabled, consent, minMatchScore (50–100), maxPerDay (1–20) }`. Enabling requires `consent: true` and an uploaded resume. `POST /api/resume/auto-apply/run` runs it once now.
- `DELETE /api/resume` removes the resume and turns auto-apply off.
- An hourly job (`jobs/autoApplyJob.js`, :10 past the hour, lock-protected) applies for opted-in candidates: internal, approved, active jobs only; at or above the chosen score; within the daily cap; never to a job already applied to; skips work-permit-ineligible jobs. Applications are tagged `appliedVia: 'auto-apply'` and the candidate is notified.
- New backend deps: `multer`, `pdf-parse` (v2, needs Node ≥ 20.16 / 22.3), `mammoth` → run `npm install` in `backend/`.
