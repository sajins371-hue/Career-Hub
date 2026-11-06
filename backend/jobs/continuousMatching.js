const cron = require('node-cron');
const User = require('../models/User');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { scoreCandidateAgainstJob } = require('../utils/matching');
const { sendMail, templates } = require('../utils/email');
const { acquireLock, releaseLock } = require('../utils/distributedLock');
const { PUBLIC_APPROVAL_FILTER } = require('../utils/jobVisibility');

const MATCH_THRESHOLD = 75;
const LOCK_NAME = 'continuous-matching';
const LOCK_TTL_MS = 10 * 60 * 1000; // generous vs. expected run time; bounds how long a crashed run can block others

async function runContinuousMatching() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // jobs posted in the last day
  // A job is "new" from the moment it went live: approval time for reviewed jobs, else posted time.
  const newJobs = await Job.find({
    status: 'active',
    ...PUBLIC_APPROVAL_FILTER,
    $or: [{ reviewedAt: { $gte: since } }, { reviewedAt: { $exists: false }, postedAt: { $gte: since } }]
  });
  if (newJobs.length === 0) return;

  const candidates = await User.find({ role: 'candidate' });

  const notifications = [];
  let digestsSent = 0;

  for (const candidate of candidates) {
    const candidateMatches = [];
    for (const job of newJobs) {
      const { score } = scoreCandidateAgainstJob(candidate, job);
      if (score >= MATCH_THRESHOLD) {
        candidateMatches.push({ job, score });
        notifications.push({
          user: candidate._id,
          type: 'job-match',
          job: job._id,
          matchScore: score,
          message: `New ${score}% match: ${job.title}`
        });
      }
    }

    // One digest email per candidate per run, not one email per match — avoids inbox spam.
    if (candidateMatches.length > 0 && candidate.email) {
      const mail = templates.jobMatchDigest(
        candidate.name,
        candidateMatches.map(m => ({ title: m.job.title, score: m.score }))
      );
      await sendMail({ to: candidate.email, ...mail });
      digestsSent++;
    }
  }

  if (notifications.length) await Notification.insertMany(notifications);
  console.log(`Continuous matching: ${notifications.length} notifications, ${digestsSent} digest emails`);
}

function scheduleContinuousMatching() {
  // Runs every hour. At real scale, replace the O(candidates x jobs) loop with
  // a precomputed skill-index / vector search (e.g. Elasticsearch, pgvector, Pinecone).
  //
  // Multiple API instances each run their own cron scheduler, so without coordination
  // every instance would run this job on the same schedule (duplicate notifications/emails,
  // wasted DB work). A short-lived Mongo-backed lock ensures only one instance's run wins
  // each tick; others skip that tick entirely.
  cron.schedule('0 * * * *', async () => {
    let acquired = false;
    try {
      acquired = await acquireLock(LOCK_NAME, LOCK_TTL_MS);
    } catch (err) {
      console.error('Continuous matching: failed to acquire lock:', err);
      return;
    }
    if (!acquired) {
      console.log('Continuous matching: another instance holds the lock, skipping this run.');
      return;
    }
    try {
      await runContinuousMatching();
    } catch (err) {
      console.error('Continuous matching failed:', err);
    } finally {
      await releaseLock(LOCK_NAME);
    }
  });
}

module.exports = { scheduleContinuousMatching, runContinuousMatching };
