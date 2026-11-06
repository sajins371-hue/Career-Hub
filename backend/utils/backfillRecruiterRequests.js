// One-off repair: creates a pending RecruiterRequest for every pending recruiter that has none,
// so they show up on the admin "Recruiter requests" page.   Run: npm run backfill-recruiters
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const RecruiterRequest = require('../models/RecruiterRequest');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const pending = await User.find({ role: 'recruiter', recruiterStatus: 'pending' });
  let created = 0;
  for (const u of pending) {
    if (!(await RecruiterRequest.findOne({ user: u._id }))) {
      await RecruiterRequest.create({ user: u._id, companyName: '(not provided)', notes: 'Backfilled request' });
      created++;
    }
  }
  console.log(`Pending recruiters: ${pending.length}, requests created: ${created}`);
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
