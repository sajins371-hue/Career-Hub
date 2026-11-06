const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  provider: String, // e.g. "Coursera", "internal", "YouTube"
  url: String,
  description: String,
  skillsTaught: { type: [String], required: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  durationHours: Number,
  isFree: { type: Boolean, default: true },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  rating: { type: Number, min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now }
});

courseSchema.index({ skillsTaught: 1 });

const enrollmentSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['enrolled', 'in-progress', 'completed', 'dropped'], default: 'enrolled' },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  // Which job this learning was prompted by, if any — lets us close the loop on skill-gap -> learning -> re-match.
  triggeredByJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date
});

enrollmentSchema.index({ candidate: 1, course: 1 }, { unique: true });

module.exports = {
  Course: mongoose.model('Course', courseSchema),
  Enrollment: mongoose.model('Enrollment', enrollmentSchema)
};
