require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const { scheduleContinuousMatching } = require('./jobs/continuousMatching');
const { scheduleAutoApply } = require('./jobs/autoApplyJob');
const { verifyMailConnection, appName } = require('./utils/email');

// Fail fast on missing critical config rather than silently running with an insecure default.
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET is short. Use a long, random value (32+ chars) in production.');
}

const app = express();

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// CORS: fail closed in production. Development may run without an explicit allow-list.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  // Dev convenience: Vite's default origin is always allowed.
  ['http://localhost:5173', 'http://127.0.0.1:5173'].forEach(o => { if (allowedOrigins.length && !allowedOrigins.includes(o)) allowedOrigins.push(o); });
}
if (process.env.NODE_ENV === 'production' && !allowedOrigins.length) {
  console.error('Missing ALLOWED_ORIGINS in production. Set one or more comma-separated frontend origins.');
  process.exit(1);
}
app.use(cors({
  origin: allowedOrigins.length
    ? (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS'))
    : true,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// Strip any keys starting with '$' or containing '.' from req.body/query/params —
// blocks MongoDB operator-injection payloads like { "email": { "$gt": "" } }.
app.use(mongoSanitize());

// Prevent HTTP parameter pollution (?role=candidate&role=admin style attacks).
app.use(hpp());

// General API rate limit. Auth routes additionally apply a stricter limiter (see authRoutes.js).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/admin/jobs', require('./routes/adminJobRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/recruiter', require('./routes/recruiterRoutes'));
app.use('/api/recruiter-approval', require('./routes/recruiterApprovalRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/resume', require('./routes/resumeRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404 for unmatched API routes (kept last, before the error handler).
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`${appName()} API running on port ${PORT}`);
    scheduleContinuousMatching();
    scheduleAutoApply();
    verifyMailConnection();
  });
});

module.exports = app;
