/**
 * Adds the starter assessments WITHOUT touching any other data (safe on a populated database).
 * Skips ones that already exist (matched by skill + title).   Usage: npm run seed-assessments
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Assessment } = require('../models/Assessment');
const data = require('./assessmentSeedData');

(async () => {
  await connectDB();
  let added = 0;
  for (const a of data) {
    const exists = await Assessment.findOne({ skill: a.skill, title: a.title });
    if (!exists) { await Assessment.create(a); added++; }
  }
  console.log(`Assessments: ${added} added, ${data.length - added} already existed.`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
