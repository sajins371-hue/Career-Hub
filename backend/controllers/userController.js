const User = require('../models/User');
const Job = require('../models/Job');
const { sanitizeText } = require('../utils/sanitize');

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'headline', 'location', 'skills', 'experience', 'projects',
      'careerGoals', 'yearsOfExperience', 'languages', 'workPermits'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    if (updates.headline) updates.headline = sanitizeText(updates.headline);
    if (Array.isArray(updates.experience)) {
      updates.experience = updates.experience.map(e => ({ ...e, description: sanitizeText(e.description) }));
    }
    if (Array.isArray(updates.projects)) {
      updates.projects = updates.projects.map(p => ({ ...p, description: sanitizeText(p.description) }));
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.saveJob = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedJobs: req.params.jobId } });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.unsaveJob = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedJobs: req.params.jobId } });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('savedJobs');
    res.json({ savedJobs: user.savedJobs });
  } catch (err) { next(err); }
};
