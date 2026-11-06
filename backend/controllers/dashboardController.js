const Job = require('../models/Job');
const User = require('../models/User');
const Company = require('../models/Company');
const Application = require('../models/Application');
const RecruiterRequest = require('../models/RecruiterRequest');
const { Submission } = require('../models/Assessment');
const { PUBLIC_APPROVAL_FILTER } = require('../utils/jobVisibility');

// GET /api/dashboard/recruiter — summary of the logged-in recruiter's own hiring activity.
// Scope mirrors /api/jobs/mine: jobs they posted plus jobs of companies they recruit for.
exports.recruiterSummary = async (req, res, next) => {
  try {
    const companies = await Company.find({ recruiters: req.user._id }).select('name').lean();
    const jobs = await Job.find({
      status: { $ne: 'removed' },
      $or: [{ postedBy: req.user._id }, { company: { $in: companies.map(c => c._id) } }]
    }).select('title status approvalStatus rejectionReason postedAt').sort({ postedAt: -1 }).lean();

    const ids = jobs.map(j => j._id);
    const appMatch = { job: { $in: ids }, status: { $ne: 'saved' } }; // 'saved' is a candidate's private bookmark

    const [byStatus, recent] = await Promise.all([
      Application.aggregate([{ $match: appMatch }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Application.find(appMatch).sort({ createdAt: -1 }).limit(5)
        .select('status matchScore createdAt candidate job')
        .populate('candidate', 'name headline').populate('job', 'title').lean()
    ]);
    const n = (s) => byStatus.find(x => x._id === s)?.n || 0;

    const pending = jobs.filter(j => j.approvalStatus === 'pending');
    const rejected = jobs.filter(j => j.approvalStatus === 'rejected');
    const live = jobs.filter(j => j.approvalStatus !== 'pending' && j.approvalStatus !== 'rejected' && j.status === 'active');

    res.json({
      companies: companies.map(c => c.name),
      jobs: { total: jobs.length, live: live.length, pending: pending.length, rejected: rejected.length },
      applications: {
        total: byStatus.reduce((sum, x) => sum + x.n, 0),
        new: n('applied'), inReview: n('in-review'), interviewing: n('interviewing'), offer: n('offer')
      },
      recentApplications: recent,
      rejectedJobs: rejected.slice(0, 3).map(j => ({ _id: j._id, title: j.title, rejectionReason: j.rejectionReason }))
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/admin — platform-wide work queues and totals.
exports.adminSummary = async (req, res, next) => {
  try {
    const [pendingJobs, pendingRecruiters, pendingSubmissions, usersByRole, liveJobs, companies, applications, recentPendingJobs] =
      await Promise.all([
        Job.countDocuments({ approvalStatus: 'pending', status: { $ne: 'removed' } }),
        RecruiterRequest.countDocuments({ status: 'pending' }),
        Submission.countDocuments({ status: 'pending' }),
        User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
        Job.countDocuments({ status: 'active', ...PUBLIC_APPROVAL_FILTER }),
        Company.estimatedDocumentCount(),
        Application.estimatedDocumentCount(),
        Job.find({ approvalStatus: 'pending', status: { $ne: 'removed' } })
          .select('title company companyNameRaw postedBy postedAt').sort({ postedAt: -1 }).limit(5)
          .populate('company', 'name').populate('postedBy', 'name').lean()
      ]);
    const users = (role) => usersByRole.find(x => x._id === role)?.n || 0;

    res.json({
      queues: { pendingJobs, pendingRecruiters, pendingSubmissions },
      totals: { candidates: users('candidate'), recruiters: users('recruiter'), liveJobs, companies, applications },
      recentPendingJobs
    });
  } catch (err) { next(err); }
};
