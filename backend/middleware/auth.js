const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'User no longer exists' });
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email address before using this feature.' });
  }
  next();
}

function requireRecruiterApproved(req, res, next) {
  if (req.user.role === 'recruiter' && req.user.recruiterStatus !== 'approved') {
    return res.status(403).json({ error: 'Recruiter access is pending admin approval.' });
  }
  next();
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action' });
    }
    next();
  };
}

module.exports = { protect, requireVerifiedEmail, requireRecruiterApproved, restrictTo };
