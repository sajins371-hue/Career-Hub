const router = require('express').Router();
const applicationController = require('../controllers/applicationController');
const { protect, requireVerifiedEmail, requireRecruiterApproved, restrictTo } = require('../middleware/auth');
const { applicationStatusRules } = require('../middleware/validators');

router.post('/', protect, requireVerifiedEmail, applicationController.apply);
router.get('/me', protect, requireVerifiedEmail, applicationController.myApplications);
router.get('/', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, applicationController.listForJob);
router.patch('/:id/status', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, applicationStatusRules, applicationController.updateStatus);
router.patch('/:id/withdraw', protect, requireVerifiedEmail, applicationController.withdraw);

module.exports = router;
