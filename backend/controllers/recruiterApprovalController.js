const RecruiterRequest = require('../models/RecruiterRequest');
const User = require('../models/User');
const Company = require('../models/Company');
const { sendMail, appName } = require('../utils/email');
const { issueVerificationEmail } = require('../utils/verification');

exports.createRequest = async (req, res, next) => {
  try {
    const { name, email, password, companyName, companyWebsite, phone, notes } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role === 'recruiter' && existing.recruiterStatus === 'pending') {
        // Repair: a pending recruiter with no request document would never show in the admin list.
        const has = await RecruiterRequest.findOne({ user: existing._id });
        if (!has) {
          const repaired = await RecruiterRequest.create({ user: existing._id, companyName, companyWebsite, phone, notes });
          return res.status(201).json({ pendingApproval: true, requestId: repaired._id, message: 'Recruiter request submitted. Check your email to verify your address, then wait for admin approval.' });
        }
        return res.status(409).json({ error: 'A recruiter request already exists for this email.' });
      }
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role: 'recruiter', recruiterStatus: 'pending' });
    let request;
    try {
      request = await RecruiterRequest.create({ user: user._id, companyName, companyWebsite, phone, notes });
    } catch (e) {
      await User.findByIdAndDelete(user._id); // don't leave a user with no request behind
      throw e;
    }
    issueVerificationEmail(user).catch(err => console.error('[mail] verification email error:', err.message));
    res.status(201).json({ pendingApproval: true, requestId: request._id, message: 'Recruiter request submitted. Check your email to verify your address, then wait for admin approval.' });
  } catch (err) { next(err); }
};

exports.listPending = async (req, res, next) => {
  try {
    const requests = await RecruiterRequest.find({ status: 'pending' }).populate('user', 'name email emailVerified recruiterStatus createdAt').sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) { next(err); }
};

exports.review = async (req, res, next) => {
  try {
    const { decision } = req.body;
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or rejected' });
    const request = await RecruiterRequest.findById(req.params.id).populate('user', 'name email emailVerified');
    if (!request) return res.status(404).json({ error: 'Recruiter request not found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'This request has already been reviewed.' });
    if (decision === 'approved' && !request.user.emailVerified) {
      return res.status(400).json({ error: 'The recruiter must verify their email before approval.' });
    }

    request.status = decision;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    await User.findByIdAndUpdate(request.user._id, { recruiterStatus: decision });
    if (decision === 'approved' && request.companyName) {
      const domain = request.companyWebsite ? (() => { try { return new URL(request.companyWebsite).hostname.replace(/^www\./, ''); } catch (_) { return ''; } })() : '';
      let company = domain ? await Company.findOne({ domain }) : null;
      if (!company) company = await Company.findOne({ name: request.companyName.trim() });
      if (!company) company = await Company.create({ name: request.companyName.trim(), domain });
      if (!company.recruiters.some(id => id.equals(request.user._id))) {
        company.recruiters.push(request.user._id);
        await company.save();
      }
    }
    const subject = decision === 'approved' ? `${appName()} recruiter access approved` : `${appName()} recruiter request update`;
    const message = decision === 'approved'
      ? 'Your recruiter account has been approved. Verify your email, then sign in to access the hiring dashboard.'
      : `Your recruiter request was not approved. You may contact the ${appName()} administrator for more information.`;
    sendMail({ to: request.user.email, subject, text: `Hi ${request.user.name}, ${message}` }).catch(() => {});
    res.json({ request });
  } catch (err) { next(err); }
};
