const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  companyNameRaw: String, // used when sourced externally before company is resolved/deduped

  // The recruiter who created this job (internal postings only — externally-ingested jobs
  // leave this unset). Used, alongside Company.recruiters, to authorize who can edit/remove it.
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'internship', 'contract', 'temporary'],
    default: 'full-time'
  },
  isPaidInternship: Boolean, // only meaningful when employmentType === 'internship'
  internshipDurationWeeks: Number,

  description: String,
  requiredSkills: [String],
  niceToHaveSkills: [String],
  minYearsExperience: Number,

  location: { city: String, country: String, remote: Boolean, hybrid: Boolean },
  workPermitRequired: [String],

  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' },
    isEstimated: { type: Boolean, default: false } // true if we filled this via the salary estimator, not the listing
  },

  // Job discovery / source aggregation
  source: { type: String, enum: ['internal', 'linkedin', 'indeed', 'adzuna', 'other'], default: 'internal' },
  sourceUrl: String,
  sourceJobId: String, // external id, used for dedup

  // Job quality
  status: { type: String, enum: ['active', 'expired', 'flagged', 'removed'], default: 'active' },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  qualitySignals: {
    isDuplicate: { type: Boolean, default: false },
    isExpired: { type: Boolean, default: false },
    isSuspicious: { type: Boolean, default: false },
    suspiciousReasons: [String]
  },

  // Admin approval workflow. Defaults to 'approved' so existing/seeded/externally-ingested jobs
  // stay visible; recruiter-created jobs are explicitly set to 'pending' in createJob.
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  rejectionReason: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,

  postedAt: { type: Date, default: Date.now },
  expiresAt: Date,

  language: { type: String, default: 'en' }
});

jobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });
jobSchema.index({ sourceUrl: 1, sourceJobId: 1 });
jobSchema.index({ approvalStatus: 1, postedAt: -1 }); // admin pending queue, newest first

module.exports = mongoose.model('Job', jobSchema);
