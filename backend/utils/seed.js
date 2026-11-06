/**
 * Quick seed script so you can test the API immediately after setup.
 * Usage: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const { Assessment, Submission } = require('../models/Assessment');
const assessmentSeedData = require('./assessmentSeedData');
const { Course, Enrollment } = require('../models/Course');
const courseSeedData = require('./courseSeedData');

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Company.deleteMany({}), Job.deleteMany({}), Assessment.deleteMany({}), Submission.deleteMany({}), Course.deleteMany({}), Enrollment.deleteMany({})]);

  const company = await Company.create({
    name: 'Acme Robotics',
    domain: 'acmerobotics.com',
    industry: 'Robotics',
    size: '201-500',
    locations: ['San Francisco, USA'],
    isVerified: true,
    hiringTrend: [{ month: '2026-07', jobsPosted: 4 }, { month: '2026-08', jobsPosted: 7 }],
    turnoverSignals: { avgTenureMonths: 28, recentLayoffs: false, glassdoorRating: 4.1 },
    salaryDistribution: [{ role: 'Software Engineer', min: 120000, max: 165000, source: 'aggregated' }],
    interviewProcess: [
      { stageName: 'Recruiter screen', typicalDurationDays: 3 },
      { stageName: 'Technical interview', typicalDurationDays: 7 },
      { stageName: 'Onsite / final loop', typicalDurationDays: 10 }
    ]
  });

  const recruiter = await User.create({
    name: 'Rina Recruiter',
    email: 'recruiter@acmerobotics.com',
    password: 'password123',
    role: 'recruiter',
    recruiterStatus: 'approved',
    emailVerified: true
  });
  company.recruiters.push(recruiter._id);
  await company.save();

  const candidate = await User.create({
    name: 'Jamie Candidate',
    email: 'jamie@example.com',
    password: 'password123',
    role: 'candidate',
    emailVerified: true,
    headline: 'Backend engineer who likes distributed systems',
    location: { city: 'Austin', country: 'United States' },
    skills: ['node', 'javascript', 'mongodb', 'docker'],
    experience: [{ title: 'Backend Engineer', company: 'StartupCo', skillsUsed: ['node', 'postgresql'] }],
    projects: [{ name: 'Task queue', description: 'Built a Redis-backed job queue', skillsUsed: ['node', 'redis'] }],
    careerGoals: { targetRoles: ['Senior Backend Engineer'], timeframeMonths: 12 },
    yearsOfExperience: 3,
    workPermits: ['United States']
  });

  await User.create({
    name: 'Ada Admin',
    email: 'admin@careerhub.local',
    password: 'password123',
    role: 'admin',
    emailVerified: true
  });

  const job = await Job.create({
    title: 'Senior Backend Engineer',
    company: company._id,
    companyNameRaw: 'Acme Robotics',
    description: 'Own our order-processing services. Distributed systems experience a plus.',
    requiredSkills: ['node', 'mongodb', 'aws', 'kubernetes'],
    niceToHaveSkills: ['redis', 'docker'],
    minYearsExperience: 4,
    location: { city: 'San Francisco', country: 'United States', remote: true },
    salary: { min: 140000, max: 180000, currency: 'USD' },
    source: 'internal',
    status: 'active',
    postedBy: recruiter._id
  });

  await Assessment.insertMany(assessmentSeedData);
  await Course.insertMany(courseSeedData);

  console.log('Seeded:');
  console.log(`  ${assessmentSeedData.length} starter assessments, ${courseSeedData.length} starter courses`);
  console.log('  Recruiter login: recruiter@acmerobotics.com / password123');
  console.log('  Candidate login: jamie@example.com / password123');
  console.log('  Admin login:     admin@careerhub.local / password123');
  console.log(`  Job id: ${job._id}`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
