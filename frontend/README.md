# CareerHub — Web

React + Vite frontend for CareerHub. Talks to the `career-hub-api` backend over REST.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your running backend
npm run dev
```

Requires the CareerHub backend running (see the `career-hub-api` project) — start that first with
`npm run seed && npm run dev`, then log in here with the seeded accounts:
- Candidate: `jamie@example.com` / `password123`
- Recruiter: `recruiter@acmerobotics.com` / `password123`
- Admin: `admin@careerhub.local` / `password123`

## What's covered

- **Auth**: login, register, forgot/reset password, email verification, session persistence
- **Job discovery**: search with filters (skill, country, remote, employment type
  including internships), pagination
- **Job detail**: match score (ring gauge with breakdown), skill gap, generated learning
  path, apply, save
- **Applications**: status tracking with timeline, withdraw
- **Learning**: course catalog, enrollment, progress tracking
- **Skill assessments**: browse assessments, submit proof of work for review; admins get a
  grading queue that verifies the skill once a human assigns a score
- **Interview practice**: full live Q&A flow against the backend's structured interview
  engine, per-answer feedback, score trend chart across past sessions, resumable history
- **Career planner**: target-role skill gaps and matching open jobs
- **Company directory**: hiring trend chart, culture signals, interview process, salary
  ranges
- **Profile**: skills, target roles, experience level
- **Notifications**: job-match and application-status alerts
- **Recruiter dashboard**: post a job, natural-language candidate search, and review/manage
  applicants against your own postings

## Design system

Tokens live in `tailwind.config.js`: Compass (indigo, primary), Milestone (gold, progress/
achievement), Signal (green, verified/positive), Alert (red). Fraunces for headings and the
match-score numerals, IBM Plex Sans for UI and body text.

## Notes

This frontend was reviewed for consistency against the backend contract (every API call's
request/response shape cross-checked against the actual controller code) and the new files
added in this pass — `VerifyEmail.jsx`, `Assessments.jsx`, and the `ReviewApplications`
rewrite — were checked by hand for correct JSX/hook usage. No network access was available in
this environment to actually run `npm install` or a dev server, so do a real
`npm install && npm run dev` smoke test before deploying.
