const Job = require('../models/Job');
const Company = require('../models/Company');

/**
 * Determines whether `user` is allowed to manage (update/delete, or manage applications
 * for) the given job. Admins can always manage any job. A recruiter can manage a job if
 * they were the one who posted it, OR if they're listed as a recruiter on the job's company.
 *
 * Returns { job, authorized }. `job` is null if the job doesn't exist — callers should
 * 404 in that case before checking `authorized`.
 */
async function canManageJob(user, jobId) {
  const job = await Job.findById(jobId).select('postedBy company');
  if (!job) return { job: null, authorized: false };

  if (user.role === 'admin') return { job, authorized: true };

  if (job.postedBy && job.postedBy.equals(user._id)) {
    return { job, authorized: true };
  }

  if (job.company) {
    const company = await Company.findOne({ _id: job.company, recruiters: user._id }).select('_id');
    if (company) return { job, authorized: true };
  }

  return { job, authorized: false };
}

module.exports = { canManageJob };
