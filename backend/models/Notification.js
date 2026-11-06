const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['job-match', 'application-update', 'system'], default: 'job-match' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  matchScore: Number,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
