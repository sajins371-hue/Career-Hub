const mongoose = require('mongoose');

// A minimal distributed-lock document. `name` is unique per lock; `expiresAt` bounds how
// long a lock can be held before another instance is allowed to steal it (protects against
// a crashed process leaving a stale lock forever). See utils/distributedLock.js for usage.
const lockSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  lockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('Lock', lockSchema);
