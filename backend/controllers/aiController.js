/**
 * These endpoints need a real LLM call (Anthropic/OpenAI) to be genuinely useful.
 * Each function below does the deterministic prep work (gathering facts, constraints,
 * truthfulness guardrails) and calls `callLLM`, a single swappable function.
 * Wire callLLM to your provider of choice — see the commented example.
 */

const Job = require('../models/Job');
const User = require('../models/User');
const { computeSkillGap } = require('../utils/matching');
const { callLLM } = require('../utils/llm');
const { escapeRegex } = require('../utils/queryHelpers');
const { PUBLIC_APPROVAL_FILTER } = require('../utils/jobVisibility');

// POST /api/ai/tailor-application { jobId, baseResumeText }
// Truthfulness guardrail: prompt explicitly forbids inventing experience/skills.
exports.tailorApplication = async (req, res, next) => {
  try {
    const { jobId, baseResumeText } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const prompt = `You are tailoring a candidate's resume/cover letter for a specific job.
STRICT RULE: Do not invent skills, employers, titles, dates, or achievements that are not present
in the candidate's base resume text below. You may reorder, re-emphasize, and rephrase truthful
content to match the job's language. If the candidate lacks a required skill, do not claim it.

Job title: ${job.title}
Required skills: ${(job.requiredSkills || []).join(', ')}
Job description: ${job.description}

Candidate base resume:
${baseResumeText}

Produce: 1) a tailored resume summary (truthful only), 2) a short cover letter.`;

    const output = await callLLM(prompt);
    res.json({ jobId, output });
  } catch (err) { next(err); }
};

// POST /api/ai/mock-interview { jobId, answer?, questionIndex? }
// Stateless per-call design: client keeps the running transcript and resends it.
exports.mockInterview = async (req, res, next) => {
  try {
    const { jobId, transcript = [] } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const prompt = `Conduct a mock interview for the role "${job.title}" requiring skills:
${(job.requiredSkills || []).join(', ')}.
Conversation so far (JSON): ${JSON.stringify(transcript)}
If the candidate just answered, give brief specific feedback on that answer, then ask the next
relevant interview question. If transcript is empty, ask an opening question.`;

    const output = await callLLM(prompt);
    res.json({ jobId, output });
  } catch (err) { next(err); }
};

// GET /api/ai/career-planner — current position -> possible careers -> required skills -> matching jobs
exports.careerPlanner = async (req, res, next) => {
  try {
    const candidate = req.user;
    const targetRoles = candidate.careerGoals?.targetRoles || [];
    if (targetRoles.length === 0) {
      return res.status(400).json({ error: 'Set careerGoals.targetRoles on your profile first.' });
    }

    const plans = await Promise.all(targetRoles.map(async role => {
      const roleRegex = new RegExp(escapeRegex(role), 'i');
      const sampleJob = await Job.findOne({ title: roleRegex, status: 'active', ...PUBLIC_APPROVAL_FILTER });
      const gap = sampleJob ? computeSkillGap(candidate, sampleJob) : null;
      const matchingJobs = await Job.find({ title: roleRegex, status: 'active', ...PUBLIC_APPROVAL_FILTER }).limit(5);
      return {
        targetRole: role,
        representativeSkillGap: gap,
        openJobs: matchingJobs.map(j => ({ id: j._id, title: j.title }))
      };
    }));

    res.json({ currentHeadline: candidate.headline, plans });
  } catch (err) { next(err); }
};

// GET /api/ai/networking?jobId= — suggests connection angles (NOT scraping personal data).
// Real implementation should query a consenting professional-network dataset/API (e.g. LinkedIn API
// with proper OAuth + user consent) rather than scraping. This stub defines the contract only.
exports.networkingSuggestions = async (req, res, next) => {
  try {
    const job = await Job.findById(req.query.jobId).populate('company');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      note: 'Wire this to a consented professional-network API (e.g. LinkedIn Partner API) to return real people.',
      suggestedAngles: [
        `Alumni from your school who work at ${job.company?.name || 'the company'}`,
        `People who hold the "${job.title}" title there currently`,
        `Employees who posted about the team/product in the last 3 months`
      ]
    });
  } catch (err) { next(err); }
};
