const router = require('express').Router();
const userController = require('../controllers/userController');
const { protect, requireVerifiedEmail } = require('../middleware/auth');

router.patch('/me', protect, requireVerifiedEmail, userController.updateProfile);
router.get('/me/saved-jobs', protect, requireVerifiedEmail, userController.getSavedJobs);
router.post('/me/saved-jobs/:jobId', protect, requireVerifiedEmail, userController.saveJob);
router.delete('/me/saved-jobs/:jobId', protect, requireVerifiedEmail, userController.unsaveJob);

module.exports = router;
