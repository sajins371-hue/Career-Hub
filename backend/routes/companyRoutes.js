const router = require('express').Router();
const companyController = require('../controllers/companyController');
const { protect, requireVerifiedEmail, requireRecruiterApproved, restrictTo } = require('../middleware/auth');
const { companyCreateRules } = require('../middleware/validators');

router.get('/', companyController.listCompanies);
router.post('/', protect, requireVerifiedEmail, restrictTo('recruiter', 'admin'), requireRecruiterApproved, companyCreateRules, companyController.createCompany);
router.get('/:id/intelligence', companyController.getIntelligence);
router.patch('/:id/verify', protect, requireVerifiedEmail, restrictTo('admin'), companyController.verifyCompany);

module.exports = router;
