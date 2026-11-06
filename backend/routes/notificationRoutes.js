const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const { protect, requireVerifiedEmail } = require('../middleware/auth');

router.get('/', protect, requireVerifiedEmail, notificationController.myNotifications);
router.patch('/:id/read', protect, requireVerifiedEmail, notificationController.markRead);

module.exports = router;
