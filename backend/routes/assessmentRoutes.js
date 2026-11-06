const router = require('express').Router();
const assessmentController = require('../controllers/assessmentController');
const { protect, requireVerifiedEmail, restrictTo } = require('../middleware/auth');
const { assessmentCreateRules, gradeSubmissionRules } = require('../middleware/validators');

router.get('/', assessmentController.listAssessments);
router.post('/', protect, requireVerifiedEmail, restrictTo('admin'), assessmentCreateRules, assessmentController.createAssessment);
router.post('/:id/submit', protect, requireVerifiedEmail, assessmentController.submit);

router.get('/submissions/mine', protect, assessmentController.mySubmissions);
router.get('/submissions', protect, requireVerifiedEmail, restrictTo('admin'), assessmentController.listSubmissions);
router.get('/submissions/pending', protect, requireVerifiedEmail, restrictTo('admin'), assessmentController.listPendingSubmissions);
router.patch('/submissions/:id/grade', protect, requireVerifiedEmail, restrictTo('admin'), gradeSubmissionRules, assessmentController.gradeSubmission);

module.exports = router;
