const Job = require('../models/Job');
const { parsePagination } = require('../utils/queryHelpers');
const { sanitizeText } = require('../utils/sanitize');

const LIST_FIELDS = 'title company companyNameRaw postedBy postedAt employmentType location status approvalStatus qualitySignals';

// GET /api/admin/jobs/pending?page=&limit=   (admin only)
// Paginated + lean + field-limited so the queue stays fast with thousands of pending jobs.
exports.listPending = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const filter = { approvalStatus: 'pending', status: { $ne: 'removed' } };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .select(LIST_FIELDS)
        .populate('company', 'name')
        .populate('postedBy', 'name email')
        .sort({ postedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter)
    ]);
    res.json({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), jobs });
  } catch (err) { next(err); }
};

// GET /api/admin/jobs/:id — full job for the review modal.
exports.getForReview = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name industry isVerified')
      .populate('postedBy', 'name email')
      .lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) { next(err); }
};

// Shared guard + atomic transition PENDING -> APPROVED/REJECTED.
async function review(req, res, next, decision) {
  try {
    const job = await Job.findById(req.params.id).select('postedBy status approvalStatus');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.postedBy && job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'You cannot review a job you posted yourself.' });
    }

    const $set = { approvalStatus: decision, reviewedBy: req.user._id, reviewedAt: new Date() };
    const update = { $set };
    if (decision === 'approved') {
      update.$unset = { rejectionReason: 1 };
      // The admin's review supersedes the automatic quality flag, so an approved job really goes live.
      if (job.status === 'flagged') $set.status = 'active';
    } else {
      const reason = sanitizeText((req.body.reason || '').trim());
      if (reason) $set.rejectionReason = reason; else update.$unset = { rejectionReason: 1 };
    }

    // Filtering on approvalStatus:'pending' makes this atomic: two admins can't both act on one job.
    const updated = await Job.findOneAndUpdate(
      { _id: job._id, approvalStatus: 'pending' }, update, { new: true }
    ).select('title approvalStatus rejectionReason reviewedAt status');
    if (!updated) return res.status(409).json({ error: 'This job is no longer pending review.' });

    res.json({ job: updated });
  } catch (err) { next(err); }
}

// POST /api/admin/jobs/:id/approve
exports.approve = (req, res, next) => review(req, res, next, 'approved');
// POST /api/admin/jobs/:id/reject  { reason? }
exports.reject = (req, res, next) => review(req, res, next, 'rejected');
