const router = require('express').Router();
const { protect, requireVerifiedEmail, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/recruiterApprovalController');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validators');

router.post('/request', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/),
  body('companyName').trim().isLength({ min: 2, max: 200 }),
  body('companyWebsite').optional({ checkFalsy: true }).isURL(),
  body('phone').optional().trim().isLength({ max: 40 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
  handleValidation
], controller.createRequest);
router.get('/requests', protect, requireVerifiedEmail, restrictTo('admin'), controller.listPending);
router.patch('/requests/:id', protect, requireVerifiedEmail, restrictTo('admin'), [body('decision').isIn(['approved', 'rejected']), handleValidation], controller.review);
module.exports = router;
