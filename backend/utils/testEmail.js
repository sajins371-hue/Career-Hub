/**
 * Sends a test email so you can confirm your SMTP settings work.
 * Usage: npm run test-email -- you@example.com   (defaults to SMTP_USER)
 */
require('dotenv').config();
const { sendMail, verifyMailConnection, appName } = require('./email');

(async () => {
  const to = process.argv[2] || process.env.SMTP_USER;
  if (!to) { console.error('Usage: npm run test-email -- you@example.com'); process.exit(1); }
  const conn = await verifyMailConnection();
  if (!conn.ok) process.exit(1);
  const r = await sendMail({
    to,
    subject: `${appName()} — SMTP test`,
    text: 'If you can read this, your SMTP settings work.',
    html: '<p>If you can read this, your SMTP settings work.</p>'
  });
  console.log(r.ok ? `Test email sent to ${to}. Check inbox and spam.` : 'Test email FAILED (see error above).');
  process.exit(r.ok ? 0 : 1);
})();
