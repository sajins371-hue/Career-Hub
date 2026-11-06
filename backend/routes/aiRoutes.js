const router = require('express').Router();
const aiController = require('../controllers/aiController');
const { protect, requireVerifiedEmail } = require('../middleware/auth');

router.post('/tailor-application', protect, requireVerifiedEmail, aiController.tailorApplication);
router.post('/mock-interview', protect, requireVerifiedEmail, aiController.mockInterview);
router.get('/career-planner', protect, requireVerifiedEmail, aiController.careerPlanner);
router.get('/networking', protect, requireVerifiedEmail, aiController.networkingSuggestions);

module.exports = router;
