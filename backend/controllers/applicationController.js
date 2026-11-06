const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { scoreCandidateAgainstJob } = require('../utils/matching');
const { sendMail, templates } = require('../utils/email');
const { canManageJob } = require('../utils/authorization');
const { isApprovedJob } = require('../utils/jobVisibility');

// POST /api/applications { jobId }
exports.apply = async (req, res, next) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job || !isApprovedJob(job)) return res.status(404).json({ error: 'Job not found' });

    const { score, breakdown } = scoreCandidateAgainstJob(req.user, job);

    const application = await Application.create({
      candidate: req.user._id,
      job: job._id,
      status: 'applied',
      matchScore: score,
      matchExplanation: breakdown,
      timeline: [{ status: 'applied', note: 'Application submitted' }]
    });
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already applied to this job' });
    next(err);
  }
};

// GET /api/applications/me — one-click application management, unified across sources.
exports.myApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .populate({ path: 'job', populate: { path: 'company', select: 'name' } })
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (err) { next(err); }
};

// GET /api/applications?jobId= (recruiter/admin) — applicants for one of the recruiter's own
// postings, so "review applications" has something to actually list before a status can be
// changed. Ownership-checked the same way updateStatus is.
exports.listForJob = async (req, res, next) => {
  try {
    const { jobId } = req.query;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    if (req.user.role !== 'admin') {
      const { job, authorized } = await canManageJob(req.user, jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (!authorized) {
        return res.status(403).json({ error: 'You do not have permission to view applications for this job' });
      }
    }

    const applications = await Application.find({ job: jobId })
      .populate('candidate', 'name email headline skills yearsOfExperience')
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (err) { next(err); }
};

// PATCH /api/applications/:id/status (recruiter/admin)
exports.updateStatus = async (req, res, next) => {
  try {
    const existing = await Application.findById(req.params.id).select('job');
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    if (req.user.role !== 'admin') {
      const { job, authorized } = await canManageJob(req.user, existing.job);
      if (!job || !authorized) {
        return res.status(403).json({ error: 'You do not have permission to update this application' });
      }
    }

    const { status, note } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, $push: { timeline: { status, note } } },
      { new: true, runValidators: true }
    ).populate('job', 'title').populate('candidate', 'name email');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Notify the candidate — fire-and-forget so a slow mail server never blocks the recruiter's request.
    if (application.candidate?.email) {
      const mail = templates.applicationStatusChanged(
        application.candidate.name, application.job?.title || 'your application', status
      );
      sendMail({ to: application.candidate.email, ...mail }).catch(() => {});
    }

    res.json({ application });
  } catch (err) { next(err); }
};

exports.withdraw = async (req, res, next) => {
  try {
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, candidate: req.user._id },
      { status: 'withdrawn', $push: { timeline: { status: 'withdrawn' } } },
      { new: true }
    );
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json({ application });
  } catch (err) { next(err); }
};
