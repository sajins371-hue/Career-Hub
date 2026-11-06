const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
}

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role').optional().isIn(['candidate', 'recruiter']).withMessage('Invalid role'),
  handleValidation
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  handleValidation
];

const verifyEmailRules = [
  body('userId').isMongoId().withMessage('Invalid verification link'),
  body('token').isString().isLength({ min: 20, max: 200 }).withMessage('Invalid verification link'),
  handleValidation
];

const resendVerificationRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  handleValidation
];

const resetPasswordRules = [
  body('userId').isMongoId().withMessage('Invalid or expired reset link'),
  body('token').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidation
];

const changePasswordRules = [
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidation
];

const courseCreateRules = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('title must be 2-200 characters'),
  body('provider').optional().trim().isLength({ max: 100 }),
  body('url').optional({ checkFalsy: true }).isURL().withMessage('url must be a valid URL'),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('skillsTaught').isArray({ min: 1 }).withMessage('skillsTaught must be a non-empty array'),
  body('skillsTaught.*').trim().isLength({ min: 1, max: 60 }),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('durationHours').optional().isFloat({ min: 0, max: 2000 }),
  body('isFree').optional().isBoolean(),
  body('price').optional().isFloat({ min: 0, max: 1000000 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('rating').optional().isFloat({ min: 0, max: 5 }),
  handleValidation
];

const assessmentCreateRules = [
  body('skill').trim().isLength({ min: 1, max: 100 }).withMessage('skill is required'),
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('type').optional().isIn(['quiz', 'project', 'timed-coding']),
  body('passingScore').optional().isFloat({ min: 0, max: 100 }),
  body('rubric').optional().isArray({ max: 50 }),
  body('rubric.*.criterion').optional().trim().isLength({ max: 300 }),
  body('rubric.*.weight').optional().isFloat({ min: 0 }),
  handleValidation
];

const gradeSubmissionRules = [
  body('score').isFloat({ min: 0, max: 100 }).withMessage('score must be a number between 0 and 100'),
  body('feedback').optional().isString().isLength({ max: 1000 }).withMessage('feedback must be at most 1000 characters'),
  handleValidation
];

const jobCreateRules = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('title must be 2-200 characters'),
  body('company').optional().isMongoId().withMessage('company must be a valid id'),
  body('companyNameRaw').optional().trim().isLength({ max: 200 }),
  body('employmentType').optional().isIn(['full-time', 'part-time', 'internship', 'contract', 'temporary']),
  body('isPaidInternship').optional().isBoolean(),
  body('internshipDurationWeeks').optional().isInt({ min: 1, max: 260 }),
  body('description').trim().isLength({ min: 20, max: 20000 }).withMessage('description must be 20-20000 characters'),
  body('requiredSkills').optional().isArray({ max: 100 }),
  body('requiredSkills.*').trim().isLength({ min: 1, max: 80 }),
  body('niceToHaveSkills').optional().isArray({ max: 100 }),
  body('niceToHaveSkills.*').trim().isLength({ min: 1, max: 80 }),
  body('minYearsExperience').optional().isFloat({ min: 0, max: 60 }),
  body('location').optional().isObject(),
  body('location.city').optional().trim().isLength({ max: 100 }),
  body('location.country').optional().trim().isLength({ max: 100 }),
  body('location.remote').optional().isBoolean(),
  body('location.hybrid').optional().isBoolean(),
  body('workPermitRequired').optional().isArray({ max: 50 }),
  body('workPermitRequired.*').trim().isLength({ min: 1, max: 100 }),
  body('salary').optional().isObject(),
  body('salary.min').optional().isFloat({ min: 0, max: 1000000000 }),
  body('salary.max').optional().isFloat({ min: 0, max: 1000000000 }),
  body('salary.currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
  body('sourceUrl').optional({ checkFalsy: true }).isURL().withMessage('sourceUrl must be a valid URL'),
  body('expiresAt').optional().isISO8601().withMessage('expiresAt must be a valid date'),
  body('language').optional().trim().isLength({ min: 2, max: 10 }),
  handleValidation
];


const jobUpdateRules = [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('company').optional().isMongoId(),
  body('employmentType').optional().isIn(['full-time', 'part-time', 'internship', 'contract', 'temporary']),
  body('isPaidInternship').optional().isBoolean(),
  body('internshipDurationWeeks').optional().isInt({ min: 1, max: 260 }),
  body('description').optional().trim().isLength({ min: 20, max: 20000 }),
  body('requiredSkills').optional().isArray({ max: 100 }),
  body('requiredSkills.*').trim().isLength({ min: 1, max: 80 }),
  body('niceToHaveSkills').optional().isArray({ max: 100 }),
  body('niceToHaveSkills.*').trim().isLength({ min: 1, max: 80 }),
  body('minYearsExperience').optional().isFloat({ min: 0, max: 60 }),
  body('location').optional().isObject(),
  body('location.city').optional().trim().isLength({ max: 100 }),
  body('location.country').optional().trim().isLength({ max: 100 }),
  body('location.remote').optional().isBoolean(),
  body('location.hybrid').optional().isBoolean(),
  body('workPermitRequired').optional().isArray({ max: 50 }),
  body('workPermitRequired.*').trim().isLength({ min: 1, max: 100 }),
  body('salary').optional().isObject(),
  body('salary.min').optional().isFloat({ min: 0, max: 1000000000 }),
  body('salary.max').optional().isFloat({ min: 0, max: 1000000000 }),
  body('salary.currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
  body('sourceUrl').optional({ checkFalsy: true }).isURL(),
  body('expiresAt').optional().isISO8601(),
  body('language').optional().trim().isLength({ min: 2, max: 10 }),
  body('status').optional().isIn(['active', 'expired', 'flagged', 'removed']),
  handleValidation
];

const applicationStatusRules = [
  body('status').isIn(['saved', 'applied', 'in-review', 'interviewing', 'offer', 'rejected', 'withdrawn']).withMessage('Invalid application status'),
  body('note').optional().trim().isLength({ max: 2000 }),
  handleValidation
];

const progressRules = [
  body('progressPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('progressPercent must be between 0 and 100'),
  body('status').optional().isIn(['enrolled', 'in-progress', 'completed', 'dropped']).withMessage('Invalid enrollment status'),
  body().custom(value => Object.prototype.hasOwnProperty.call(value, 'progressPercent') || Object.prototype.hasOwnProperty.call(value, 'status')).withMessage('progressPercent or status is required'),
  handleValidation
];

const companyCreateRules = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('name is required'),
  body('domain').optional().trim().isLength({ max: 200 }),
  body('industry').optional().trim().isLength({ max: 100 }),
  body('size').optional().trim().isLength({ max: 50 }),
  body('locations').optional().isArray({ max: 100 }),
  body('locations.*').optional().trim().isLength({ max: 100 }),
  handleValidation
];

module.exports = {
  registerRules, loginRules, forgotPasswordRules, resetPasswordRules, changePasswordRules,
  verifyEmailRules, resendVerificationRules,
  courseCreateRules, assessmentCreateRules, gradeSubmissionRules, companyCreateRules,
  jobCreateRules, jobUpdateRules, applicationStatusRules, progressRules, handleValidation
};
