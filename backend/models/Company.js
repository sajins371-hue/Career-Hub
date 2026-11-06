const mongoose = require('mongoose');

const salaryDatapointSchema = new mongoose.Schema({
  role: String,
  min: Number,
  max: Number,
  currency: { type: String, default: 'USD' },
  source: { type: String, enum: ['self-reported', 'aggregated', 'verified'], default: 'self-reported' }
}, { _id: false });

const interviewStageSchema = new mongoose.Schema({
  stageName: String,
  typicalDurationDays: Number,
  notes: String
}, { _id: false });

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  domain: String, // used for verification (email domain match, etc.)
  industry: String,
  size: String,
  locations: [String],

  isVerified: { type: Boolean, default: false },
  verificationNotes: String,

  // Company intelligence
  hiringTrend: [{ month: String, jobsPosted: Number }],
  turnoverSignals: {
    avgTenureMonths: Number,
    recentLayoffs: Boolean,
    glassdoorRating: Number
  },
  salaryDistribution: [salaryDatapointSchema],
  interviewProcess: [interviewStageSchema],

  recruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);
