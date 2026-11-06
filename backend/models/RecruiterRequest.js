const mongoose = require('mongoose');

const recruiterRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, trim: true, maxlength: 200 },
  companyWebsite: { type: String, trim: true, maxlength: 500 },
  phone: { type: String, trim: true, maxlength: 40 },
  notes: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

recruiterRequestSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('RecruiterRequest', recruiterRequestSchema);
