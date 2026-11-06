const { Assessment, Submission } = require('../models/Assessment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail, templates } = require('../utils/email');
const { escapeRegex } = require('../utils/queryHelpers');

exports.listAssessments = async (req, res, next) => {
  try {
    const filter = req.query.skill ? { skill: new RegExp(escapeRegex(req.query.skill), 'i') } : {};
    const assessments = await Assessment.find(filter);
    res.json({ assessments });
  } catch (err) { next(err); }
};

exports.createAssessment = async (req, res, next) => {
  try {
    const { skill, title, description, type, passingScore, rubric } = req.body;
    const assessment = await Assessment.create({ skill, title, description, type, passingScore, rubric });
    res.status(201).json({ assessment });
  } catch (err) { next(err); }
};

// POST /api/assessments/:id/submit { submissionUrl }
// The candidate can only submit their work — never a score. The submission sits as
// 'pending' until a human reviewer grades it via gradeSubmission below. There is no
// automated grader wired up yet (unit-test runner, rubric LLM grading, etc.); until one
// exists, every submission requires a human grade before it can verify a skill.
exports.submit = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const submissionUrl = String(req.body.submissionUrl || '').trim();
    if (!submissionUrl) return res.status(400).json({ error: 'submissionUrl is required' });
    // Reviewers open this link, so only plain web links are accepted (blocks javascript:/data: URLs).
    let parsed;
    try { parsed = new URL(submissionUrl); } catch { parsed = null; }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'submissionUrl must be a valid http(s) link' });
    }
    if (submissionUrl.length > 500) return res.status(400).json({ error: 'submissionUrl is too long' });

    const existing = await Submission.findOne({ assessment: assessment._id, candidate: req.user._id, status: 'pending' });
    if (existing) return res.status(409).json({ error: 'You already have a submission pending review for this assessment' });

    const submission = await Submission.create({
      assessment: assessment._id,
      candidate: req.user._id,
      submissionUrl,
      status: 'pending'
    });

    res.status(201).json({ submission, message: 'Submission received and is pending review.' });
  } catch (err) { next(err); }
};

// PATCH /api/assessments/submissions/:id/grade (admin) { score }
// The only place a score can be assigned to a submission. Sets passed/verifiedSkills
// from that score, exactly like the old auto-accept path did — the difference is that
// only a trusted grader, not the candidate, can supply the number.
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { score } = req.body;
    const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim().slice(0, 1000) : '';
    if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'score must be a number between 0 and 100' });
    }

    const submission = await Submission.findById(req.params.id)
      .populate('assessment')
      .populate('candidate', 'name email');
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (submission.status === 'graded') return res.status(409).json({ error: 'Submission has already been graded' });

    const assessment = submission.assessment;
    const passed = score >= assessment.passingScore;

    submission.score = score;
    submission.passed = passed;
    submission.status = 'graded';
    submission.reviewedBy = 'human';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    if (feedback) submission.feedback = feedback;
    await submission.save();

    const level = score >= 90 ? 'expert' : score >= 75 ? 'advanced' : 'intermediate';
    if (passed) {
      // Re-verifying a skill the candidate already has updates that entry instead of duplicating it.
      const updated = await User.updateOne(
        { _id: submission.candidate._id, 'verifiedSkills.skill': assessment.skill },
        { $set: { 'verifiedSkills.$.level': level, 'verifiedSkills.$.assessmentId': assessment._id, 'verifiedSkills.$.verifiedAt': new Date() } }
      );
      if (!updated.matchedCount) {
        await User.findByIdAndUpdate(submission.candidate._id, {
          $push: { verifiedSkills: { skill: assessment.skill, level, verifiedBy: 'assessment', assessmentId: assessment._id, verifiedAt: new Date() } },
          $inc: { trustScore: 5 }
        });
      }
      if (submission.candidate.email) {
        sendMail({
          to: submission.candidate.email,
          ...templates.assessmentPassed(submission.candidate.name, assessment.skill)
        }).catch(() => {});
      }
    }

    // In-app notification for both outcomes so the candidate always hears back.
    Notification.create({
      user: submission.candidate._id,
      type: 'system',
      message: passed
        ? `Your ${assessment.skill} assessment passed (${score}/100) — the skill is now verified on your profile.`
        : `Your ${assessment.skill} assessment scored ${score}/100 (passing is ${assessment.passingScore}).${feedback ? ' Reviewer feedback: ' + feedback : ''}`
    }).catch(() => {});

    res.json({ submission });
  } catch (err) { next(err); }
};

// GET /api/assessments/submissions?status=pending|graded&page=&limit= (admin) — review queue + history.
exports.listSubmissions = async (req, res, next) => {
  try {
    const status = req.query.status === 'graded' ? 'graded' : 'pending';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { status };
    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('assessment', 'skill title description passingScore rubric')
        .populate('candidate', 'name email')
        .populate('gradedBy', 'name')
        .sort(status === 'pending' ? { submittedAt: 1 } : { gradedAt: -1 })
        .skip((page - 1) * limit).limit(limit),
      Submission.countDocuments(filter)
    ]);
    res.json({ submissions, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { next(err); }
};

// Kept for backwards compatibility with the existing client.
exports.listPendingSubmissions = async (req, res, next) => {
  req.query.status = 'pending';
  return exports.listSubmissions(req, res, next);
};

// GET /api/assessments/submissions/mine — the candidate's own submissions and outcomes.
exports.mySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ candidate: req.user._id })
      .populate('assessment', 'skill title passingScore')
      .sort({ submittedAt: -1 }).limit(100);
    res.json({ submissions });
  } catch (err) { next(err); }
};
