const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { extractText, parseResume } = require('../utils/resumeParser');
const { scoreLiveJobs, groupByCompany } = require('../utils/resumeMatching');
const { runAutoApplyForUser } = require('../utils/autoApply');

function publicResume(user) {
  const r = user.resume || {};
  return r.uploadedAt ? {
    fileName: r.fileName, sizeBytes: r.sizeBytes, uploadedAt: r.uploadedAt,
    parsedSkills: r.parsedSkills || [], parsedYears: r.parsedYears || 0, parsedHeadline: r.parsedHeadline || ''
  } : null;
}

function publicSettings(user) {
  const a = user.autoApply || {};
  return {
    enabled: !!a.enabled, consentedAt: a.consentedAt || null,
    minMatchScore: a.minMatchScore ?? 75, maxPerDay: a.maxPerDay ?? 5, lastRunAt: a.lastRunAt || null
  };
}

async function matchesFor(user) {
  const scored = await scoreLiveJobs(user);
  return groupByCompany(scored);
}

// POST /api/resume (multipart, field "resume")
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach a resume file (PDF, DOCX or TXT).' });
    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (text.length < 80) {
      return res.status(422).json({ error: 'We could not read any text from that file. If it is a scanned image, upload a text-based PDF or DOCX.' });
    }

    // Vocabulary: skills employers actually ask for, so niche skills on real postings are detected too.
    const jobSkills = await Job.distinct('requiredSkills', { status: 'active' });
    const parsed = parseResume(text.slice(0, 60000), jobSkills);

    const user = await User.findByIdAndUpdate(req.user._id, {
      resume: {
        fileName: req.file.originalname.slice(0, 200), mimeType: req.file.mimetype, sizeBytes: req.file.size,
        uploadedAt: new Date(), text: text.slice(0, 60000),
        parsedSkills: parsed.skills, parsedYears: parsed.years, parsedHeadline: parsed.headline
      }
    }, { new: true });

    const companies = await matchesFor(user);
    res.status(201).json({ resume: publicResume(user), autoApply: publicSettings(user), companies });
  } catch (err) { next(err); }
};

// GET /api/resume — current resume, auto-apply settings, and fresh company matches.
exports.get = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const resume = publicResume(user);
    const companies = resume ? await matchesFor(user) : [];
    const autoApplied = await Application.find({ candidate: user._id, appliedVia: 'auto-apply' })
      .populate({ path: 'job', select: 'title company companyNameRaw', populate: { path: 'company', select: 'name' } })
      .sort({ createdAt: -1 }).limit(10);
    res.json({ resume, autoApply: publicSettings(user), companies, autoApplied });
  } catch (err) { next(err); }
};

// DELETE /api/resume — also switches auto-apply off, since it depends on the resume.
exports.remove = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { resume: 1 }, 'autoApply.enabled': false });
    res.status(204).send();
  } catch (err) { next(err); }
};

// PATCH /api/resume/auto-apply { enabled, consent, minMatchScore, maxPerDay }
exports.updateAutoApply = async (req, res, next) => {
  try {
    const { enabled, consent, minMatchScore, maxPerDay } = req.body;
    const user = await User.findById(req.user._id);
    const update = {};

    if (minMatchScore !== undefined) {
      const n = Number(minMatchScore);
      if (!Number.isFinite(n) || n < 50 || n > 100) return res.status(400).json({ error: 'Minimum match must be between 50 and 100.' });
      update['autoApply.minMatchScore'] = Math.round(n);
    }
    if (maxPerDay !== undefined) {
      const n = Number(maxPerDay);
      if (!Number.isFinite(n) || n < 1 || n > 20) return res.status(400).json({ error: 'Daily limit must be between 1 and 20.' });
      update['autoApply.maxPerDay'] = Math.round(n);
    }
    if (enabled !== undefined) {
      if (enabled === true) {
        if (!user.resume?.uploadedAt) return res.status(400).json({ error: 'Upload a resume before turning on auto-apply.' });
        if (consent !== true) return res.status(400).json({ error: 'You must explicitly consent to applications being submitted on your behalf.' });
        update['autoApply.enabled'] = true;
        update['autoApply.consentedAt'] = new Date();
      } else {
        update['autoApply.enabled'] = false;
      }
    }

    const saved = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    let ran = { applied: [] };
    if (enabled === true) ran = await runAutoApplyForUser(saved); // first pass right away
    const fresh = await User.findById(req.user._id);
    res.json({ autoApply: publicSettings(fresh), applied: ran.applied });
  } catch (err) { next(err); }
};

// POST /api/resume/auto-apply/run — run once now (only does anything if enabled).
exports.runNow = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.autoApply?.enabled) return res.status(400).json({ error: 'Auto-apply is turned off.' });
    const result = await runAutoApplyForUser(user);
    res.json(result);
  } catch (err) { next(err); }
};
