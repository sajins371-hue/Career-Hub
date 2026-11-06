/**
 * Resume -> company matching. Reuses the platform's explainable job-scoring model
 * (utils/matching.js) on a candidate view that merges profile data with resume-derived data,
 * then groups the scored jobs by company.
 */
const Job = require('../models/Job');
const { scoreCandidateAgainstJob } = require('./matching');
const { PUBLIC_APPROVAL_FILTER } = require('./jobVisibility');

/** A plain-object candidate whose skills/experience are the union of profile + resume. */
function candidateWithResume(user) {
  const base = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  const resumeSkills = base.resume?.parsedSkills || [];
  const skills = [...new Set([...(base.skills || []), ...resumeSkills].map(s => String(s).toLowerCase().trim()).filter(Boolean))];
  const yearsOfExperience = Math.max(base.yearsOfExperience || 0, base.resume?.parsedYears || 0);
  return { ...base, skills, yearsOfExperience };
}

function liveJobFilter() {
  return {
    status: 'active',
    ...PUBLIC_APPROVAL_FILTER,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  };
}

/** Score every live job for this candidate. Returns [{ job, score, breakdown }] sorted high->low. */
async function scoreLiveJobs(user, { limit = 500 } = {}) {
  const candidate = candidateWithResume(user);
  const jobs = await Job.find(liveJobFilter())
    .populate('company', 'name industry size isVerified locations')
    .sort({ postedAt: -1 })
    .limit(limit);
  return jobs
    .map(job => ({ job, ...scoreCandidateAgainstJob(candidate, job) }))
    .sort((a, b) => b.score - a.score);
}

/** Group scored jobs by company; a company's score is its best job match. */
function groupByCompany(scored, { minScore = 40, perCompany = 3 } = {}) {
  const groups = new Map();
  for (const item of scored) {
    if (item.score < minScore) continue;
    const c = item.job.company;
    const key = c?._id ? String(c._id) : `raw:${(item.job.companyNameRaw || '').toLowerCase()}`;
    const name = c?.name || item.job.companyNameRaw;
    if (!name) continue;
    if (!groups.has(key)) {
      groups.set(key, { companyId: c?._id || null, name, industry: c?.industry, isVerified: !!c?.isVerified, bestScore: 0, jobs: [], openRoles: 0 });
    }
    const g = groups.get(key);
    g.openRoles += 1;
    g.bestScore = Math.max(g.bestScore, item.score);
    if (g.jobs.length < perCompany) {
      g.jobs.push({
        _id: item.job._id,
        title: item.job.title,
        score: item.score,
        employmentType: item.job.employmentType,
        location: item.job.location,
        source: item.job.source,
        matchedSkills: item.breakdown.requiredSkills.matched,
        missingSkills: item.breakdown.requiredSkills.missing
      });
    }
  }
  return [...groups.values()].sort((a, b) => b.bestScore - a.bestScore || b.openRoles - a.openRoles);
}

module.exports = { candidateWithResume, scoreLiveJobs, groupByCompany, liveJobFilter };
