const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const experienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  startDate: Date,
  endDate: Date,
  description: String,
  skillsUsed: [String]
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: String,
  description: String,
  skillsUsed: [String],
  url: String
}, { _id: false });

const verifiedSkillSchema = new mongoose.Schema({
  skill: String,
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
  verifiedBy: { type: String, enum: ['self-reported', 'assessment', 'endorsement'], default: 'self-reported' },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
  verifiedAt: Date
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['candidate', 'recruiter', 'admin'], default: 'candidate' },
  recruiterStatus: { type: String, enum: ['not-applicable', 'pending', 'approved', 'rejected'], default: 'not-applicable' },

  // Candidate discovery / matching profile
  headline: String,
  location: { city: String, country: String, remoteOnly: Boolean },
  skills: [String],
  verifiedSkills: [verifiedSkillSchema],
  experience: [experienceSchema],
  projects: [projectSchema],
  careerGoals: {
    targetRoles: [String],
    targetIndustries: [String],
    timeframeMonths: Number
  },
  yearsOfExperience: { type: Number, default: 0 },
  languages: [String],
  workPermits: [String], // countries the candidate is authorized to work in

  // Trust
  isVerified: { type: Boolean, default: false },
  trustScore: { type: Number, default: 0 }, // 0-100, derived from verifications/assessments

  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],

  // Uploaded resume (text extracted server-side; the original file is not stored).
  resume: {
    fileName: String,
    mimeType: String,
    sizeBytes: Number,
    uploadedAt: Date,
    text: { type: String, select: false },
    parsedSkills: [String],
    parsedYears: Number,
    parsedHeadline: String
  },

  // Explicit, revocable permission for the platform to apply on the candidate's behalf.
  autoApply: {
    enabled: { type: Boolean, default: false },
    consentedAt: Date,          // when the candidate last turned this on
    minMatchScore: { type: Number, default: 75, min: 50, max: 100 },
    maxPerDay: { type: Number, default: 5, min: 1, max: 20 },
    lastRunAt: Date
  },

  // Security: account lockout after repeated failed logins (brute-force protection)
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },

  // Security: password reset flow — we store a hash of the token, never the raw token
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },

  // Security: email verification (separate from `isVerified` above, which is identity/trust verification)
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  emailVerificationSentAt: { type: Date, select: false },

  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
