const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  title: String,
  description: String,
  type: { type: String, enum: ['quiz', 'project', 'timed-coding'], default: 'project' },
  passingScore: { type: Number, default: 70 },
  rubric: [{ criterion: String, weight: Number }],
  createdAt: { type: Date, default: Date.now }
});

const submissionSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissionUrl: String,

  // score/passed are set only by gradeSubmission (assessmentController) — never accepted
  // directly from the candidate's own submit request. status stays 'pending' until then.
  status: { type: String, enum: ['pending', 'graded'], default: 'pending' },
  score: Number,
  passed: Boolean,
  reviewedBy: { type: String, enum: ['auto', 'human'], default: 'auto' },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: Date,

  feedback: String,
  submittedAt: { type: Date, default: Date.now }
});

module.exports = {
  Assessment: mongoose.model('Assessment', assessmentSchema),
  Submission: mongoose.model('Submission', submissionSchema)
};
