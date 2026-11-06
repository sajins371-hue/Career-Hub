const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerRules, loginRules, forgotPasswordRules, resetPasswordRules, changePasswordRules, verifyEmailRules, resendVerificationRules
} = require('../middleware/validators');

// Stricter limiter on auth endpoints specifically — these are the brute-force/enumeration
// targets, so they get a tighter budget than the general API rate limit in server.js.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' }
});

router.post('/register', authLimiter, registerRules, authController.register);
router.post('/login', authLimiter, loginRules, authController.login);
router.post('/forgot-password', authLimiter, forgotPasswordRules, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, authController.resetPassword);
router.post('/verify-email', verifyEmailRules, authController.verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationRules, authController.resendVerification);
router.patch('/change-password', protect, changePasswordRules, authController.changePassword);
router.get('/me', protect, authController.me);

module.exports = router;
