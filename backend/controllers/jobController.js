const Job = require('../models/Job');
const User = require('../models/User');
const Company = require('../models/Company');
const { runQualityChecks } = require('../utils/jobQuality');
const { scoreCandidateAgainstJob, computeSkillGap } = require('../utils/matching');
const { estimateSalary } = require('../utils/salaryEstimator');
const { sanitizeFields } = require('../utils/sanitize');
const { escapeRegex, parsePagination } = require('../utils/queryHelpers');
const { canManageJob } = require('../utils/authorization');
const { PUBLIC_APPROVAL_FILTER, isApprovedJob } = require('../utils/jobVisibility');
const { isDeepStrictEqual } = require('util');

// Editing any of these on a live/rejected job sends it back to the admin for review.
const REVIEW_FIELDS = ['title', 'description', 'requiredSkills', 'niceToHaveSkills', 'minYearsExperience',
  'employmentType', 'location', 'salary', 'workPermitRequired'];

// GET /api/jobs?q=&skills=&location=&remote=&minSalary=&source=&page=&limit=
// Unified search across internally stored jobs (which may be aggregated from
// external sources by the ingestion job in jobs/ingestExternalJobs.js).
exports.searchJobs = async (req, res, next) => {
  try {
    const { q, skills, country, remote, minSalary, source, employmentType } = req.query;
    const { page, limit } = parsePagination(req.query);
    const filter = { status: 'active', ...PUBLIC_APPROVAL_FILTER };

    if (q) filter.$text = { $search: q };
    if (skills) filter.requiredSkills = { $in: skills.split(',').map(s => s.trim()) };
    if (country) filter['location.country'] = new RegExp(`^${escapeRegex(country)}$`, 'i');
    if (remote === 'true') filter['location.remote'] = true;
    if (source) filter.source = source;
    if (employmentType) filter.employmentType = employmentType; // e.g. 'internship'
    if (minSalary) filter['salary.max'] = { $gte: Number(minSalary) };

    const jobs = await Job.find(filter)
      .populate('company', 'name industry isVerified')
      .sort({ postedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Job.countDocuments(filter);
    res.json({ total, page, limit, jobs });
  } catch (err) { next(err); }
};

// GET /api/jobs/mine (recruiter/admin) — the recruiter's own postings (by postedBy or via
// their company), so the UI has something to list before picking one to review applicants for.
exports.myJobs = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      const companies = await Company.find({ recruiters: req.user._id }).select('_id');
      filter = { $or: [{ postedBy: req.user._id }, { company: { $in: companies.map(c => c._id) } }] };
    }
    const jobs = await Job.find(filter)
      .select('title status approvalStatus rejectionReason postedAt requiredSkills location employmentType')
      .sort({ postedAt: -1 });
    res.json({ jobs });
  } catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('company');
    if (!job || !isApprovedJob(job)) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) { next(err); }
};

// POST /api/jobs (recruiter/admin) — runs quality checks and, if no salary given, estimates one.
exports.createJob = async (req, res, next) => {
  try {
    const jobData = sanitizeFields(
      { ...req.body, source: req.body.source || 'internal', postedBy: req.user._id },
      ['title', 'description']
    );

    // Recruiters must post under a company they recruit for. If the form didn't send one,
    // default to their (first) company so the job shows a company name and can be managed.
    if (req.user.role === 'recruiter' && !jobData.company) {
      const own = await Company.findOne({ recruiters: req.user._id }).select('_id name');
      if (!own) return res.status(403).json({ error: 'Your account is not linked to a company yet. Ask an admin to check your recruiter approval.' });
      jobData.company = own._id;
      jobData.companyNameRaw = own.name;
    }

    if (req.user.role === 'recruiter' && jobData.company) {
      const company = await Company.findOne({ _id: jobData.company, recruiters: req.user._id }).select('_id');
      if (!company) return res.status(403).json({ error: 'You can only post jobs for a company you recruit for.' });
    }

    if (!jobData.salary || (!jobData.salary.min && !jobData.salary.max)) {
      const estimate = estimateSalary({
        title: jobData.title,
        yearsOfExperience: jobData.minYearsExperience || 0,
        country: jobData.location?.country
      });
      jobData.salary = estimate;
    }

    // Approval fields are server-controlled: never trust them from the request body.
    ['approvalStatus', 'rejectionReason', 'reviewedBy', 'reviewedAt'].forEach(k => delete jobData[k]);

    const quality = await runQualityChecks(jobData);
    // Recruiter jobs wait for admin review; admin-posted jobs are trusted and go live directly.
    const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending';
    const job = await Job.create({ ...jobData, ...quality, approvalStatus });
    res.status(201).json({
      job,
      published: approvalStatus === 'approved' && job.status === 'active',
      message: approvalStatus === 'pending'
        ? 'Job submitted. It will be visible to candidates once an admin approves it.'
        : job.status === 'active' ? 'Job posted.' : `Job saved but not public (status: ${job.status}).`
    });
  } catch (err) { next(err); }
};

exports.updateJob = async (req, res, next) => {
  try {
    const { job, authorized } = await canManageJob(req.user, req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!authorized) return res.status(403).json({ error: 'You do not have permission to modify this job' });

    // req.body may not include `postedBy`/`company` reassignment — strip anything that
    // would let a recruiter hand the job off or otherwise escape the ownership check.
    // Approval fields are admin-only (via /api/admin/jobs) — strip them so a recruiter can't self-approve.
    const { postedBy, company, approvalStatus, rejectionReason, reviewedBy, reviewedAt, ...rest } = req.body;
    const updates = sanitizeFields(rest, ['title', 'description']);

    // If a recruiter changes important details of an approved (or rejected) job, send it back to
    // PENDING so the admin reviews the new version. Admin edits never change approval state.
    let resubmit = false;
    if (req.user.role !== 'admin') {
      const current = await Job.findById(req.params.id);
      if (current && ['approved', 'rejected'].includes(current.approvalStatus)) {
        const before = JSON.parse(JSON.stringify(current.toObject()));
        const changed = REVIEW_FIELDS.some(k => updates[k] !== undefined && !isDeepStrictEqual(updates[k], before[k]));
        if (changed) { updates.approvalStatus = 'pending'; resubmit = true; }
      }
    }

    const updateDoc = { $set: updates };
    if (resubmit) updateDoc.$unset = { rejectionReason: 1, reviewedBy: 1, reviewedAt: 1 };
    const updated = await Job.findByIdAndUpdate(req.params.id, updateDoc, { new: true, runValidators: true });
    res.json({ job: updated, ...(resubmit && { message: 'Changes saved. The job is hidden until an admin approves the update.' }) });
  } catch (err) { next(err); }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const { job, authorized } = await canManageJob(req.user, req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!authorized) return res.status(403).json({ error: 'You do not have permission to remove this job' });

    await Job.findByIdAndUpdate(req.params.id, { status: 'removed' });
    res.status(204).send();
  } catch (err) { next(err); }
};

// GET /api/jobs/:id/match — score the logged-in candidate against this job, with explanation.
exports.matchJobToMe = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !isApprovedJob(job)) return res.status(404).json({ error: 'Job not found' });
    const result = scoreCandidateAgainstJob(req.user, job);
    res.json(result);
  } catch (err) { next(err); }
};

// GET /api/jobs/:id/skill-gap — what the candidate is missing for this specific job.
exports.skillGapForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !isApprovedJob(job)) return res.status(404).json({ error: 'Job not found' });
    const gap = computeSkillGap(req.user, job);
    res.json(gap);
  } catch (err) { next(err); }
};

// GET /api/jobs/recommended — continuous matching feed: top-N active jobs ranked for this candidate.
exports.recommendedJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ status: 'active', ...PUBLIC_APPROVAL_FILTER }).limit(300); // cap for scoring cost; use a vector/ANN index at scale
    const { limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const ranked = jobs
      .map(job => ({ job, ...scoreCandidateAgainstJob(req.user, job) }))
      .filter(r => r.score >= (Number(req.query.minScore) || 50))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    res.json({ results: ranked });
  } catch (err) { next(err); }
};
