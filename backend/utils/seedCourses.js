/**
 * Adds the starter courses WITHOUT touching any other data (safe on a populated database).
 * Skips ones that already exist (matched by title).   Usage: npm run seed-courses
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Course } = require('../models/Course');
const data = require('./courseSeedData');

(async () => {
  await connectDB();
  let added = 0;
  for (const c of data) {
    if (!(await Course.findOne({ title: c.title }))) { await Course.create(c); added++; }
  }
  console.log(`Courses: ${added} added, ${data.length - added} already existed.`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
