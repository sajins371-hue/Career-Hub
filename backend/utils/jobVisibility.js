// Candidate-facing queries must never expose jobs that are awaiting or denied admin approval.
// `$nin` (rather than `approvalStatus: 'approved'`) keeps legacy jobs that pre-date this field
// visible without needing a data migration.
const PUBLIC_APPROVAL_FILTER = { approvalStatus: { $nin: ['pending', 'rejected'] } };

// For a hydrated Job document (schema default makes legacy docs read as 'approved').
function isApprovedJob(job) {
  return !!job && job.approvalStatus === 'approved';
}

module.exports = { PUBLIC_APPROVAL_FILTER, isApprovedJob };
