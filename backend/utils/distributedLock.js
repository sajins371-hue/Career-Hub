const Lock = require('../models/Lock');

/**
 * Acquires a named, TTL-bounded lock. Returns true if this call acquired it, false if
 * another instance currently holds a still-valid lock.
 *
 * Safe under concurrency: the "no lock exists yet" case relies on the unique index on
 * `name` (a duplicate-key error means we lost the race). The "existing lock has expired"
 * case is a single atomic findOneAndUpdate conditioned on expiresAt, so only one caller
 * can successfully steal it even if several attempt to at once.
 */
async function acquireLock(name, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    await Lock.create({ name, lockedAt: now, expiresAt });
    return true;
  } catch (err) {
    if (err.code !== 11000) throw err; // not a duplicate-key error — something else went wrong

    const stolen = await Lock.findOneAndUpdate(
      { name, expiresAt: { $lte: now } },
      { lockedAt: now, expiresAt },
      { new: true }
    );
    return !!stolen;
  }
}

async function releaseLock(name) {
  await Lock.deleteOne({ name }).catch(() => {});
}

module.exports = { acquireLock, releaseLock };
