const router = require('express').Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const resumeController = require('../controllers/resumeController');
const { protect, requireVerifiedEmail, restrictTo } = require('../middleware/auth');

const ALLOWED_EXT = /\.(pdf|docx|txt)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT.test(file.originalname)) return cb(null, true);
    const err = new Error('Unsupported file type. Upload a PDF, DOCX or TXT resume.');
    err.statusCode = 400;
    cb(err);
  }
});

// Parsing is CPU-heavy; keep a tighter cap than the global limiter.
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

function handleUpload(req, res, next) {
  upload.single('resume')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Resume is too large (max 5 MB).' });
    next(err);
  });
}

const guard = [protect, requireVerifiedEmail, restrictTo('candidate')];

router.get('/', ...guard, resumeController.get);
router.post('/', ...guard, uploadLimiter, handleUpload, resumeController.upload);
router.delete('/', ...guard, resumeController.remove);
router.patch('/auto-apply', ...guard, resumeController.updateAutoApply);
router.post('/auto-apply/run', ...guard, resumeController.runNow);

module.exports = router;
