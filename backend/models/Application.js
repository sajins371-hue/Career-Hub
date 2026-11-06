const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

  status: {
    type: String,
    enum: ['saved', 'applied', 'in-review', 'interviewing', 'offer', 'rejected', 'withdrawn'],
    default: 'applied'
  },

  matchScore: Number, // snapshot of match score at time of application
  matchExplanation: mongoose.Schema.Types.Mixed, // breakdown, see utils/matching.js

  tailoredResumeUrl: String,
  tailoredCoverLetter: String,

  appliedVia: { type: String, enum: ['portal', 'external-redirect', 'auto-apply'], default: 'portal' },
  timeline: [{
    status: { type: String, enum: ['saved', 'applied', 'in-review', 'interviewing', 'offer', 'rejected', 'withdrawn'], required: true },
    changedAt: { type: Date, default: Date.now },
    note: String
  }],

  createdAt: { type: Date, default: Date.now }
});

applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
