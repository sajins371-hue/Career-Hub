// End-to-end check of the admin job-approval flow against a RUNNING dev server with seeded data.
//   1) npm run seed     (WARNING: wipes the dev database)
//   2) npm run dev      (in another terminal)
//   3) npm run test-job-approval
// Needs Node 18+ (built-in fetch).
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); if (!ok) failed++; };

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null; try { data = await res.json(); } catch { /* 204 */ }
  return { status: res.status, data };
}
const login = async (email) => (await api('POST', '/auth/login', null, { email, password: 'password123' })).data.token;
const jobIds = (r) => (r.data?.jobs || []).map(j => j._id);

(async () => {
  const [admin, recruiter, candidate] = await Promise.all([
    login('admin@careerhub.local'), login('recruiter@acmerobotics.com'), login('jamie@example.com')
  ]);
  const title = `Smoke Test Role ${Date.now()}`;
  const desc = 'Build and maintain backend services for our logistics platform using Node.js and MongoDB.';
  const post = (t) => api('POST', '/jobs', recruiter, { title: t, description: desc, requiredSkills: ['node'], location: { country: 'USA', remote: true } });

  // Recruiter posts -> pending, hidden from candidates
  const created = await post(title);
  const jobId = created.data?.job?._id;
  check('recruiter can post a job (201)', created.status === 201, JSON.stringify(created.data));
  check('new recruiter job is pending', created.data?.job?.approvalStatus === 'pending');
  check('pending job hidden from candidate search', !jobIds(await api('GET', `/jobs?q=${encodeURIComponent(title)}`, candidate)).includes(jobId));
  check('pending job returns 404 on direct fetch', (await api('GET', `/jobs/${jobId}`, candidate)).status === 404);
  check('candidate cannot apply to pending job', (await api('POST', '/applications', candidate, { jobId })).status === 404);

  // Security: non-admins blocked, recruiter cannot self-approve
  check('candidate blocked from pending list (403)', (await api('GET', '/admin/jobs/pending', candidate)).status === 403);
  check('recruiter blocked from pending list (403)', (await api('GET', '/admin/jobs/pending', recruiter)).status === 403);
  check('recruiter cannot call approve (403)', (await api('POST', `/admin/jobs/${jobId}/approve`, recruiter)).status === 403);
  check('candidate cannot call reject (403)', (await api('POST', `/admin/jobs/${jobId}/reject`, candidate, { reason: 'x' })).status === 403);
  check('anonymous blocked (401)', (await api('GET', '/admin/jobs/pending')).status === 401);
  await api('PATCH', `/jobs/${jobId}`, recruiter, { approvalStatus: 'approved' });
  check('recruiter PATCH cannot self-approve', !jobIds(await api('GET', `/jobs?q=${encodeURIComponent(title)}`, candidate)).includes(jobId));

  // Admin sees it, with pagination
  const pending = await api('GET', '/admin/jobs/pending?page=1&limit=1', admin);
  check('admin sees pending jobs', pending.status === 200 && pending.data.total >= 1);
  check('pagination respects limit', (pending.data?.jobs || []).length <= 1 && pending.data?.limit === 1);
  check('pending list includes the new job', jobIds(await api('GET', '/admin/jobs/pending?limit=50', admin)).includes(jobId));

  // Approve -> visible, then cannot be reviewed twice
  const approved = await api('POST', `/admin/jobs/${jobId}/approve`, admin);
  check('admin can approve', approved.status === 200 && approved.data?.job?.approvalStatus === 'approved', JSON.stringify(approved.data));
  check('approved job visible in candidate search', jobIds(await api('GET', `/jobs?q=${encodeURIComponent(title)}`, candidate)).includes(jobId));
  check('approving twice returns 409', (await api('POST', `/admin/jobs/${jobId}/approve`, admin)).status === 409);

  // Edit approved job -> back to pending, hidden again
  await api('PATCH', `/jobs/${jobId}`, recruiter, { title: title + ' v2' });
  check('editing approved job sends it back to pending',
    !jobIds(await api('GET', `/jobs?q=${encodeURIComponent(title)}`, candidate)).includes(jobId)
    && jobIds(await api('GET', '/admin/jobs/pending?limit=50', admin)).includes(jobId));

  // Reject with reason -> hidden, reason visible to recruiter
  const rejected = await api('POST', `/admin/jobs/${jobId}/reject`, admin, { reason: 'Job description contains incomplete information.' });
  check('admin can reject with reason', rejected.status === 200 && rejected.data?.job?.approvalStatus === 'rejected', JSON.stringify(rejected.data));
  check('rejected job hidden from candidates', !jobIds(await api('GET', `/jobs?q=${encodeURIComponent(title)}`, candidate)).includes(jobId));
  const mine = await api('GET', '/jobs/mine', recruiter);
  const mineJob = (mine.data?.jobs || []).find(j => j._id === jobId);
  check('recruiter can see rejection status + reason', mineJob?.approvalStatus === 'rejected' && /incomplete/.test(mineJob?.rejectionReason || ''));

  // Role dashboards: each role gets only its own summary
  check('admin dashboard summary works', (await api('GET', '/dashboard/admin', admin)).status === 200);
  check('recruiter dashboard summary works', (await api('GET', '/dashboard/recruiter', recruiter)).status === 200);
  check('candidate blocked from admin dashboard (403)', (await api('GET', '/dashboard/admin', candidate)).status === 403);
  check('recruiter blocked from admin dashboard (403)', (await api('GET', '/dashboard/admin', recruiter)).status === 403);
  check('admin blocked from recruiter dashboard (403)', (await api('GET', '/dashboard/recruiter', admin)).status === 403);
  check('candidate blocked from recruiter dashboard (403)', (await api('GET', '/dashboard/recruiter', candidate)).status === 403);

  // Existing flows still work
  check('candidate job search still works', (await api('GET', '/jobs', candidate)).status === 200);
  check('seeded (legacy) jobs still visible to candidates', (await api('GET', '/jobs', candidate)).data?.total >= 1);

  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
