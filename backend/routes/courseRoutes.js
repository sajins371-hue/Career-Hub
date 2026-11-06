const router = require('express').Router();
const courseController = require('../controllers/courseController');
const { protect, requireVerifiedEmail, restrictTo } = require('../middleware/auth');
const { courseCreateRules, progressRules } = require('../middleware/validators');

router.get('/', courseController.listCourses);
router.post('/', protect, requireVerifiedEmail, restrictTo('admin'), courseCreateRules, courseController.createCourse);
router.get('/learning-path', protect, requireVerifiedEmail, courseController.learningPathForJob);
router.get('/my-learning', protect, requireVerifiedEmail, courseController.myLearning);
router.post('/:id/enroll', protect, requireVerifiedEmail, courseController.enroll);
router.patch('/enrollments/:id/progress', protect, requireVerifiedEmail, progressRules, courseController.updateProgress);

module.exports = router;
