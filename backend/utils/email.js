const nodemailer = require('nodemailer');

const appName = () => process.env.APP_NAME || 'CareerHub';
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!isConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 587;
  // Port 465 is always implicit TLS. Everything else (587/25) upgrades via STARTTLS, so secure=false.
  const secure = port === 465 ? true : process.env.SMTP_SECURE === 'true';

  // Gmail shows app passwords as "abcd efgh ijkl mnop" — the spaces must not be sent.
  let pass = process.env.SMTP_PASS;
  if (/gmail|google/i.test(process.env.SMTP_HOST)) pass = pass.replace(/\s+/g, '');

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
  return transporter;
}

function fromAddress() {
  return process.env.MAIL_FROM || `"${appName()}" <${process.env.SMTP_USER || 'no-reply@localhost'}>`;
}

function smtpHint(err) {
  const msg = `${err.code || ''} ${err.message || ''} ${err.response || ''}`;
  if (/EAUTH|535|Invalid login|Username and Password not accepted/i.test(msg))
    return 'Login rejected. Gmail/Outlook need an APP PASSWORD (not your normal password) and 2-step verification enabled.';
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNECTION/i.test(msg))
    return 'Cannot reach the SMTP server. Check SMTP_HOST / SMTP_PORT and that your network allows outbound SMTP.';
  if (/wrong version number|SSL|TLS|ESOCKET/i.test(msg))
    return 'TLS mismatch. Use port 587 with SMTP_SECURE=false, or port 465 (secure is forced on).';
  if (/EENVELOPE|550|553|sender/i.test(msg))
    return 'Sender rejected. MAIL_FROM must use the same address as SMTP_USER (or a verified sender).';
  return '';
}

/** Call once at startup so a bad SMTP config is obvious in the console instead of failing silently. */
async function verifyMailConnection() {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS). Emails will only be printed to this console.');
    return { ok: false, stubbed: true };
  }
  try {
    await t.verify();
    console.log(`[mail] SMTP connection OK (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER})`);
    return { ok: true };
  } catch (err) {
    console.error(`[mail] SMTP connection FAILED: ${err.message}`);
    const hint = smtpHint(err);
    if (hint) console.error(`[mail] Hint: ${hint}`);
    return { ok: false, error: err.message };
  }
}

/**
 * Sends an email. Never throws. Returns { ok, stubbed?, messageId?, error? }.
 * When SMTP isn't configured the message (including any links) is printed to the console
 * so the verification / reset flow can still be tested locally.
 */
async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email stub — SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text || ''}\n`);
    return { ok: false, stubbed: true };
  }
  try {
    const info = await t.sendMail({ from: fromAddress(), to, subject, html, text });
    console.log(`[mail] sent "${subject}" to ${to} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mail] FAILED to send "${subject}" to ${to}: ${err.message}`);
    const hint = smtpHint(err);
    if (hint) console.error(`[mail] Hint: ${hint}`);
    return { ok: false, error: err.message };
  }
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const templates = {
  welcome: (name, verifyUrl) => ({
    subject: `Verify your email — ${appName()}`,
    text: `Hi ${name},\n\nWelcome to ${appName()}! Please verify your email address by opening this link (valid for 24 hours):\n${verifyUrl}\n`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Welcome to ${escapeHtml(appName())}! Please verify your email address to unlock your account. This link is valid for 24 hours:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p><p>Or paste this link into your browser:<br>${verifyUrl}</p>`
  }),

  passwordResetRequest: (name, resetUrl) => ({
    subject: 'Reset your password',
    text: `Hi ${name},\n\nReset your password using this link (expires in 30 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your password. This link expires in 30 minutes:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password will not change.</p>`
  }),

  passwordChanged: (name) => ({
    subject: 'Your password was changed',
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your password was just changed. If this wasn't you, contact support immediately.</p>`
  }),

  applicationStatusChanged: (name, jobTitle, status) => ({
    subject: `Application update: ${jobTitle}`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your application for <strong>${escapeHtml(jobTitle)}</strong> is now: <strong>${escapeHtml(status)}</strong>.</p>`
  }),

  jobMatchDigest: (name, matches) => ({
    subject: `${matches.length} new job match${matches.length > 1 ? 'es' : ''} for you`,
    html: `<p>Hi ${escapeHtml(name)},</p><ul>${matches.map(m =>
      `<li>${escapeHtml(m.title)} — ${m.score}% match</li>`).join('')}</ul>`
  }),

  assessmentPassed: (name, skill) => ({
    subject: `You verified the "${skill}" skill`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Nice work — you passed the assessment for <strong>${escapeHtml(skill)}</strong>. It's now shown as verified on your profile.</p>`
  })
};

module.exports = { sendMail, templates, verifyMailConnection, isConfigured, appName, clientUrl };
