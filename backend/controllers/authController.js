const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendMail, templates, clientUrl } = require('../utils/email');
const { hashToken, issueVerificationEmail } = require('../utils/verification');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (role === 'recruiter') {
      // Recruiters go through /api/recruiter-approval/request so an admin-visible request exists.
      return res.status(400).json({ error: 'Recruiters must sign up with the recruiter request form so an admin can review it.' });
    }
    const requestedRole = 'candidate';
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({
      name, email, password,
      role: requestedRole,
      recruiterStatus: requestedRole === 'recruiter' ? 'pending' : 'not-applicable'
    });

    // Fire-and-forget: a slow/broken mail server should never block registration.
    // Failures are logged by sendMail, and the user can request a new link via /resend-verification.
    issueVerificationEmail(user).catch(err => console.error('[mail] verification email error:', err.message));

    if (requestedRole === 'recruiter') {
      return res.status(201).json({
        pendingApproval: true,
        message: 'Recruiter request submitted. Verify your email and wait for admin approval before signing in.',
        user: { id: user._id, name: user.name, email: user.email, role: user.role, recruiterStatus: user.recruiterStatus }
      });
    }
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Generic error message on every failure path below (user-not-found, locked, wrong password)
    // so we never reveal via response content which case occurred (prevents email enumeration).
    const genericError = () => res.status(401).json({ error: 'Invalid email or password' });

    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');
    if (!user) return genericError();

    if (user.isLocked()) {
      return res.status(423).json({ error: 'Account temporarily locked due to repeated failed logins. Try again later.' });
    }
    if (user.role === 'recruiter' && user.recruiterStatus !== 'approved') {
      return res.status(403).json({ error: user.recruiterStatus === 'rejected' ? 'Your recruiter request was rejected.' : 'Your recruiter request is still awaiting admin approval.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await user.save();
      return genericError();
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified, recruiterStatus: user.recruiterStatus } });
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/forgot-password { email }
// Always responds with the same generic message whether or not the email exists,
// to avoid leaking which addresses are registered.
exports.forgotPassword = async (req, res, next) => {
  try {
    const genericResponse = { message: 'If that email is registered, a reset link has been sent.' };
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `${clientUrl()}/reset-password?token=${rawToken}&id=${user._id}`;
    const mail = templates.passwordResetRequest(user.name, resetUrl);
    await sendMail({ to: user.email, ...mail });

    res.json(genericResponse);
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password { userId, token, newPassword }
exports.resetPassword = async (req, res, next) => {
  try {
    const { userId, token, newPassword } = req.body;
    const user = await User.findById(userId).select('+passwordResetTokenHash +passwordResetExpires');
    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const providedHash = hashToken(token);
    // Constant-time comparison to avoid timing attacks on token guessing.
    const valid = providedHash.length === user.passwordResetTokenHash.length &&
      crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(user.passwordResetTokenHash));
    if (!valid) return res.status(400).json({ error: 'Invalid or expired reset link' });

    user.password = newPassword; // re-hashed by the pre-save hook
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    sendMail({ to: user.email, ...templates.passwordChanged(user.name) }).catch(() => {});
    res.json({ message: 'Password updated. You can now log in with your new password.' });
  } catch (err) { next(err); }
};

// POST /api/auth/verify-email { userId, token }
// Idempotent: opening the link twice (or React StrictMode double-firing) still ends in "verified".
exports.verifyEmail = async (req, res, next) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select('+emailVerificationTokenHash +emailVerificationExpires');
    if (!user) return res.status(400).json({ error: 'Invalid verification link' });
    if (user.emailVerified) return res.json({ message: 'Email verified.', alreadyVerified: true });

    if (!user.emailVerificationTokenHash) {
      return res.status(400).json({ error: 'Invalid verification link' });
    }
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'This verification link has expired. Request a new one.' });
    }
    const providedHash = hashToken(token);
    const valid = providedHash.length === user.emailVerificationTokenHash.length &&
      crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(user.emailVerificationTokenHash));
    if (!valid) return res.status(400).json({ error: 'Invalid verification link' });

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    res.json({ message: 'Email verified.' });
  } catch (err) { next(err); }
};

// POST /api/auth/resend-verification { email }
// Public (recruiters awaiting approval can't sign in). Same generic reply whether or not the
// account exists / is already verified, to avoid leaking which addresses are registered.
exports.resendVerification = async (req, res, next) => {
  try {
    const genericResponse = { message: 'If that account exists and is not verified yet, a new verification email has been sent.' };
    const user = await User.findOne({ email: req.body.email }).select('+emailVerificationSentAt');
    if (!user || user.emailVerified) return res.json(genericResponse);

    // 60s cooldown per account so this can't be used to spam an inbox.
    if (user.emailVerificationSentAt && Date.now() - user.emailVerificationSentAt.getTime() < 60 * 1000) {
      return res.json(genericResponse);
    }
    await issueVerificationEmail(user);
    res.json(genericResponse);
  } catch (err) { next(err); }
};

// PATCH /api/auth/change-password (authenticated) { currentPassword, newPassword }
exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const match = await user.comparePassword(req.body.currentPassword);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = req.body.newPassword;
    await user.save();
    sendMail({ to: user.email, ...templates.passwordChanged(user.name) }).catch(() => {});
    res.json({ message: 'Password changed.' });
  } catch (err) { next(err); }
};
