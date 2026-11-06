const router = require('express').Router();
const { findCandidates } = require('../controllers/recruiterController');
const { protect, requireVerifiedEmail, requireRecruiterApproved, restrictTo } = require('../middleware/auth');

router.post('/find-candidates', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, findCandidates);

module.exports = router;
