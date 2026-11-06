const crypto = require('crypto');
const { sendMail, templates, clientUrl } = require('./email');

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates a fresh verification token for the user, saves its hash + expiry, and emails the link.
 * Used by register, recruiter request, and "resend verification". Returns sendMail's result.
 */
async function issueVerificationEmail(user) {
  const raw = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(raw);
  user.emailVerificationExpires = new Date(Date.now() + VERIFY_TTL_MS);
  user.emailVerificationSentAt = new Date();
  await user.save();

  const verifyUrl = `${clientUrl()}/verify-email?token=${raw}&id=${user._id}`;
  return sendMail({ to: user.email, ...templates.welcome(user.name, verifyUrl) });
}

module.exports = { hashToken, issueVerificationEmail };
