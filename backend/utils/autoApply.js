/**
 * Auto-apply engine. Only ever acts for candidates who have explicitly enabled it
 * (User.autoApply.enabled). Safeguards: score threshold, per-day cap, internal postings only
 * (external listings are applied to on the source site), never re-applies to a job the
 * candidate already has an application for (including withdrawn ones), and every
 * auto-application is labelled as such in the timeline and the candidate is notified.
 */
const User = require('../models/User');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { scoreLiveJobs } = require('./resumeMatching');

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

async function runAutoApplyForUser(user) {
  const settings = user.autoApply || {};
  if (!settings.enabled) return { applied: [], skipped: 'disabled' };
  if (!user.resume?.parsedSkills?.length && !user.skills?.length) return { applied: [], skipped: 'no-skills' };

  const maxPerDay = settings.maxPerDay || 5;
  const minScore = settings.minMatchScore || 75;

  const alreadyToday = await Application.countDocuments({
    candidate: user._id, appliedVia: 'auto-apply', createdAt: { $gte: startOfDay() }
  });
  let remaining = maxPerDay - alreadyToday;
  if (remaining <= 0) return { applied: [], skipped: 'daily-cap' };

  const existing = await Application.find({ candidate: user._id }).select('job');
  const seen = new Set(existing.map(a => String(a.job)));

  const scored = await scoreLiveJobs(user);
  const applied = [];
  for (const { job, score, breakdown } of scored) {
    if (remaining <= 0) break;
    if (score < minScore) break; // sorted high -> low
    if (job.source !== 'internal') continue;
    if (breakdown.locationFit.score === 0) continue; // work-permit ineligible
    if (seen.has(String(job._id))) continue;
    try {
      await Application.create({
        candidate: user._id,
        job: job._id,
        status: 'applied',
        matchScore: score,
        matchExplanation: breakdown,
        appliedVia: 'auto-apply',
        timeline: [{ status: 'applied', note: `Auto-applied from your resume (${score}% match)` }]
      });
      seen.add(String(job._id));
      applied.push({ jobId: job._id, title: job.title, company: job.company?.name || job.companyNameRaw, score });
      remaining -= 1;
    } catch (err) {
      if (err.code !== 11000) throw err; // duplicate = lost a race with a manual apply; ignore
    }
  }

  if (applied.length) {
    await Notification.insertMany(applied.map(a => ({
      user: user._id,
      type: 'application-update',
      job: a.jobId,
      matchScore: a.score,
      message: `Auto-applied to ${a.title}${a.company ? ` at ${a.company}` : ''} (${a.score}% match)`
    })));
  }
  await User.updateOne({ _id: user._id }, { 'autoApply.lastRunAt': new Date() });
  return { applied };
}

async function runAutoApplyForAll() {
  const users = await User.find({ role: 'candidate', emailVerified: true, 'autoApply.enabled': true });
  let total = 0;
  for (const u of users) {
    try { total += (await runAutoApplyForUser(u)).applied.length; }
    catch (err) { console.error(`Auto-apply failed for ${u._id}:`, err.message); }
  }
  if (total) console.log(`Auto-apply: ${total} application(s) submitted`);
}

module.exports = { runAutoApplyForUser, runAutoApplyForAll };
