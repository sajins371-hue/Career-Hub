const router = require('express').Router();
const { body, param } = require('express-validator');
const { protect, requireVerifiedEmail, restrictTo } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validators');
const controller = require('../controllers/adminJobController');

// Every route here is admin-only, enforced server-side.
router.use(protect, requireVerifiedEmail, restrictTo('admin'));

const idRule = [param('id').isMongoId(), handleValidation];

router.get('/pending', controller.listPending);
router.get('/:id', idRule, controller.getForReview);
router.post('/:id/approve', idRule, controller.approve);
router.post('/:id/reject', [param('id').isMongoId(), body('reason').optional().isString().isLength({ max: 500 }), handleValidation], controller.reject);

module.exports = router;
