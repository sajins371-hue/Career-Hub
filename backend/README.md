# CareerHub — API

Express + MongoDB (Mongoose) API for CareerHub, a career platform covering job discovery,
matching, skill-gap analysis, learning paths, mock interview training, applications, company
intelligence, career planning, and recruiter tooling. Frontend (the "R" in MERN) is not
included — this is the API layer; pair it with a React app that consumes these endpoints.

## Setup
```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET at minimum
npm run dev
```

## Feature → endpoint map

| Feature | Endpoint(s) | Status |
|---|---|---|
| Job discovery (unified search) | `GET /api/jobs` | Real search over internal DB. External sourcing via `jobs/ingestExternalJobs.js` — Adzuna wired (needs free API key), LinkedIn/Indeed are stubs pending their partner APIs |
| Duplicate/expired/suspicious detection | runs automatically on `POST /api/jobs` and ingestion | Real heuristic logic (`utils/jobQuality.js`): text-similarity dedup, regex-based scam patterns, staleness by age |
| Matching (skills+experience+projects+goals) | `GET /api/jobs/:id/match`, `GET /api/jobs/recommended` | Real, explainable weighted scoring (`utils/matching.js`) — not ML, but transparent and swappable |
| Skill gap | `GET /api/jobs/:id/skill-gap` | Real, derived from the same matching engine |
| Learning path for gaps | — | Not built. Once you pick a course provider/catalog, feed `mustLearn` skills from skill-gap into it |
| Proof of skill / assessments | `GET/POST /api/assessments`, `POST /api/assessments/:id/submit` | Scaffolded; scoring is passed in by caller — plug in a real autograder (unit tests, rubric LLM grading) before production |
| Salary estimate | auto-filled on `POST /api/jobs` when no salary given | Heuristic formula (`utils/salaryEstimator.js`) — replace base-rate table with real market data |
| Company intelligence | `GET /api/companies/:id/intelligence` | Data model + endpoint ready; hiring trend/turnover fields need a real data pipeline to populate |
| Career planner | `GET /api/ai/career-planner` | Real logic using existing matching/skill-gap; no LLM required |
| Applications (one-click, cross-source) | `POST /api/applications`, `GET /api/applications/me` | Real |
| Resume/cover letter tailoring | `POST /api/ai/tailor-application` | Contract + truthfulness-guardrail prompt ready; needs an LLM API key wired in `controllers/aiController.js::callLLM` |
| Mock interview training | `POST /api/interviews/start`, `POST /api/interviews/:id/answer`, `GET /api/interviews/me`, `GET /api/interviews/:id` | Real and fully functional with zero configuration — see below |
| Mock interview (freeform LLM chat) | `POST /api/ai/mock-interview` | Alternate, open-ended chat mode — needs LLM wiring, no persistence |
| Networking | `GET /api/ai/networking` | Contract only — real version needs a consented professional-network API (e.g. LinkedIn Partner API), not scraping |
| Recruiter AI (NL candidate search) | `POST /api/recruiter/find-candidates` | Basic keyword/regex NL parsing works now; swap `parseNaturalLanguageQuery` for LLM function-calling extraction for real natural language |
| Candidate discovery by ability | same endpoint, ranks by `verifiedSkills` + assessments, not just keywords | Real |
| Continuous matching + notifications | `jobs/continuousMatching.js` (hourly cron) | Real for small/medium scale; at large scale replace the O(candidates × jobs) loop with a vector/ANN index |
| Global (multi-language, local salary/currency, work permits) | `language` field on Job, `workPermits`/`workPermitRequired`, country-indexed salary estimator | Partially real — translation itself isn't implemented |
| Transparency (why matched) | every match/skill-gap response includes a `breakdown` object | Real |
| Trust (verify companies/recruiters/jobs/candidates) | `PATCH /api/companies/:id/verify`, `user.isVerified`/`trustScore`, assessment-driven `verifiedSkills` | Scaffolded; identity verification (KYC-style) itself isn't implemented |

## Mock interview training

`/api/interviews` is a persisted, structured practice system — not a chat stub:

- `POST /api/interviews/start { jobId }` — generates a question set from the job's required
  skills (technical questions per skill, plus behavioral and situational questions) and
  persists the full plan server-side. Returns the first question.
- `POST /api/interviews/:id/answer { answer }` — scores the answer and returns the next
  question, or a final summary once all questions are answered. The server decides
  question order from its own stored session, not from anything the client sends, so a
  candidate can't skip ahead or see upcoming questions.
- `GET /api/interviews/me` — practice history (session status, overall score, dates), so
  progress across multiple practice sessions is visible.
- `GET /api/interviews/:id` — full transcript with per-answer feedback for one session.

**Scoring works with zero configuration.** `utils/interviewFeedback.js` heuristically scores
each answer on: length/depth, filler-word usage, STAR structure (Situation/Task/Action/Result)
for behavioral and situational questions, and keyword coverage of the target skill for
technical questions. If `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set, it calls the LLM for
richer feedback instead and automatically falls back to the heuristic scorer if that call
fails or returns something unparseable — the feature never breaks either way.

The question bank (`utils/interviewQuestionBank.js`) has curated technical questions for
common skills (node, javascript, react, python, sql, mongodb, aws, docker, kubernetes) and a
generic fallback template for any other required skill, so every job gets relevant questions
even without an LLM.

## Auth
JWT bearer tokens. `POST /api/auth/register` and `/login`, then send
`Authorization: Bearer <token>` on protected routes.

## Notes on scaling this beyond a scaffold
- Swap the in-process matching loop for a search engine with skill vectors (Elasticsearch, pgvector, or a managed vector DB) once you have more than a few thousand jobs/candidates.
- Job ingestion should run as a separate worker/queue (BullMQ, etc.), not inline with requests.
- Anything under `controllers/aiController.js` needs an LLM provider key and real error/retry handling before production use.
