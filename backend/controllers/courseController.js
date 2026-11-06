const { Course, Enrollment } = require('../models/Course');
const Job = require('../models/Job');
const User = require('../models/User');
const { computeSkillGap } = require('../utils/matching');
const { buildLearningPath } = require('../utils/learningPath');
const { sanitizeFields } = require('../utils/sanitize');
const { escapeRegex, parsePagination } = require('../utils/queryHelpers');

exports.listCourses = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.skill) filter.skillsTaught = new RegExp(escapeRegex(req.query.skill), 'i');
    if (req.query.level) filter.level = req.query.level;
    if (req.query.free === 'true') filter.isFree = true;
    const { limit } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const courses = await Course.find(filter).limit(limit);
    res.json({ courses });
  } catch (err) { next(err); }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { title, provider, url, description, skillsTaught, level, durationHours, isFree, price, currency, rating } = req.body;
    const courseData = sanitizeFields(
      { title, provider, url, description, skillsTaught, level, durationHours, isFree, price, currency, rating },
      ['title', 'description']
    );
    const course = await Course.create(courseData);
    res.status(201).json({ course });
  } catch (err) { next(err); }
};

// GET /api/courses/learning-path?jobId=... — courses covering exactly what the candidate
// is missing for that job, ordered to cover the most ground first.
exports.learningPathForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.query.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const gap = computeSkillGap(req.user, job);
    const missing = [...gap.mustLearn, ...gap.goodToLearn];
    if (missing.length === 0) {
      return res.json({ message: "You already have all the skills listed for this job.", path: [] });
    }

    const courses = await Course.find({ skillsTaught: { $in: missing } });
    const result = buildLearningPath(missing, courses);
    res.json(result);
  } catch (err) { next(err); }
};

// POST /api/courses/:id/enroll { jobId? }
exports.enroll = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrollment = await Enrollment.create({
      candidate: req.user._id,
      course: course._id,
      triggeredByJob: req.body.jobId || undefined
    });
    res.status(201).json({ enrollment });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already enrolled in this course' });
    next(err);
  }
};

// PATCH /api/courses/enrollments/:id/progress { progressPercent, status? }
exports.updateProgress = async (req, res, next) => {
  try {
    const { progressPercent, status } = req.body;
    if (progressPercent !== undefined && (typeof progressPercent !== 'number' || progressPercent < 0 || progressPercent > 100)) {
      return res.status(400).json({ error: 'progressPercent must be between 0 and 100' });
    }
    const allowedStatuses = ['enrolled', 'in-progress', 'completed', 'dropped'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid enrollment status' });
    }
    const update = {};
    if (progressPercent !== undefined) update.progressPercent = progressPercent;
    if (status) update.status = status;
    if (status === 'completed' || progressPercent === 100) {
      update.status = 'completed';
      update.completedAt = new Date();
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { _id: req.params.id, candidate: req.user._id },
      update,
      { new: true }
    ).populate('course');
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    // Close the loop: on completion, add the taught skills to the candidate's self-reported
    // skill list so future matching picks them up. Not added to verifiedSkills — that stays
    // reserved for proof-of-skill assessments (see assessmentController).
    if (enrollment.status === 'completed' && enrollment.course?.skillsTaught?.length) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { skills: { $each: enrollment.course.skillsTaught.map(s => s.toLowerCase()) } }
      });
    }

    res.json({ enrollment });
  } catch (err) { next(err); }
};

exports.myLearning = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ candidate: req.user._id }).populate('course');
    res.json({ enrollments });
  } catch (err) { next(err); }
};
