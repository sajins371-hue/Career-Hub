const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['technical', 'behavioral', 'situational'], required: true },
  skillTag: String, // which required skill this question targets, if type === 'technical'
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  askedAt: { type: Date, default: Date.now }
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  text: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  feedback: {
    score: Number, // 0-100
    strengths: [String],
    improvements: [String],
    source: { type: String, enum: ['heuristic', 'llm'], default: 'heuristic' }
  }
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

  questions: [questionSchema],
  answers: [answerSchema],
  targetQuestionCount: { type: Number, default: 5, min: 1, max: 10 },

  status: { type: String, enum: ['in-progress', 'completed', 'abandoned'], default: 'in-progress' },
  overallScore: Number,
  summary: {
    strengths: [String],
    improvements: [String]
  },

  startedAt: { type: Date, default: Date.now },
  completedAt: Date
});

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
