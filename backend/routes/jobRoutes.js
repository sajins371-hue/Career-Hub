const router = require('express').Router();
const jobController = require('../controllers/jobController');
const { jobCreateRules, jobUpdateRules } = require('../middleware/validators');
const { protect, requireVerifiedEmail, requireRecruiterApproved, restrictTo } = require('../middleware/auth');

router.get('/', jobController.searchJobs);
router.get('/recommended', protect, requireVerifiedEmail, jobController.recommendedJobs);
router.get('/mine', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, jobController.myJobs);
router.get('/:id', jobController.getJob);
router.get('/:id/match', protect, requireVerifiedEmail, jobController.matchJobToMe);
router.get('/:id/skill-gap', protect, requireVerifiedEmail, jobController.skillGapForJob);

router.post('/', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, jobCreateRules, jobController.createJob);
router.patch('/:id', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, jobUpdateRules, jobController.updateJob);
router.delete('/:id', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, jobController.deleteJob);

module.exports = router;
