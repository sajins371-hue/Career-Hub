const cron = require('node-cron');
const { acquireLock, releaseLock } = require('../utils/distributedLock');
const { runAutoApplyForAll } = require('../utils/autoApply');

const LOCK_NAME = 'auto-apply';
const LOCK_TTL_MS = 10 * 60 * 1000;

// Runs 10 minutes past every hour (offset from continuous matching at :00) so newly approved
// jobs are picked up. Mongo-backed lock keeps multiple API instances from double-applying.
function scheduleAutoApply() {
  cron.schedule('10 * * * *', async () => {
    let acquired = false;
    try { acquired = await acquireLock(LOCK_NAME, LOCK_TTL_MS); }
    catch (err) { console.error('Auto-apply: failed to acquire lock:', err); return; }
    if (!acquired) return;
    try { await runAutoApplyForAll(); }
    catch (err) { console.error('Auto-apply failed:', err); }
    finally { await releaseLock(LOCK_NAME); }
  });
}

module.exports = { scheduleAutoApply };
