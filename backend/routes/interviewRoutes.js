const router = require('express').Router();
const interviewController = require('../controllers/interviewController');
const { protect, requireVerifiedEmail } = require('../middleware/auth');

router.post('/start', protect, requireVerifiedEmail, interviewController.startInterview);
router.post('/:id/answer', protect, requireVerifiedEmail, interviewController.submitAnswer);
router.get('/me', protect, requireVerifiedEmail, interviewController.myInterviews);
router.get('/:id', protect, requireVerifiedEmail, interviewController.getSession);

module.exports = router;
