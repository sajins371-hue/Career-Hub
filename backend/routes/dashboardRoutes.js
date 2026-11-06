const router = require('express').Router();
const { protect, requireVerifiedEmail, requireRecruiterApproved, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/dashboardController');

// Role dashboards are enforced server-side too — not just by which page the frontend shows.
router.get('/recruiter', protect, requireVerifiedEmail, restrictTo('recruiter'), requireRecruiterApproved, controller.recruiterSummary);
router.get('/admin', protect, requireVerifiedEmail, restrictTo('admin'), controller.adminSummary);

module.exports = router;
