import apiClient from '../lib/apiClient';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data).then(r => r.data),
  login: (data) => apiClient.post('/auth/login', data).then(r => r.data),
  me: () => apiClient.get('/auth/me').then(r => r.data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data).then(r => r.data),
  resendVerification: (email) => apiClient.post('/auth/resend-verification', { email }).then(r => r.data),
  verifyEmail: (data) => apiClient.post('/auth/verify-email', data).then(r => r.data),
  changePassword: (data) => apiClient.patch('/auth/change-password', data).then(r => r.data)
};

export const jobsApi = {
  search: (params) => apiClient.get('/jobs', { params }).then(r => r.data),
  get: (id) => apiClient.get(`/jobs/${id}`).then(r => r.data),
  recommended: (params) => apiClient.get('/jobs/recommended', { params }).then(r => r.data),
  mine: () => apiClient.get('/jobs/mine').then(r => r.data),
  match: (id) => apiClient.get(`/jobs/${id}/match`).then(r => r.data),
  skillGap: (id) => apiClient.get(`/jobs/${id}/skill-gap`).then(r => r.data),
  create: (data) => apiClient.post('/jobs', data).then(r => r.data),
  update: (id, data) => apiClient.patch(`/jobs/${id}`, data).then(r => r.data),
  remove: (id) => apiClient.delete(`/jobs/${id}`).then(r => r.data)
};

export const applicationsApi = {
  apply: (jobId) => apiClient.post('/applications', { jobId }).then(r => r.data),
  mine: () => apiClient.get('/applications/me').then(r => r.data),
  forJob: (jobId) => apiClient.get('/applications', { params: { jobId } }).then(r => r.data),
  updateStatus: (id, data) => apiClient.patch(`/applications/${id}/status`, data).then(r => r.data),
  withdraw: (id) => apiClient.patch(`/applications/${id}/withdraw`).then(r => r.data)
};

export const coursesApi = {
  list: (params) => apiClient.get('/courses', { params }).then(r => r.data),
  learningPathForJob: (jobId) => apiClient.get('/courses/learning-path', { params: { jobId } }).then(r => r.data),
  myLearning: () => apiClient.get('/courses/my-learning').then(r => r.data),
  enroll: (courseId, jobId) => apiClient.post(`/courses/${courseId}/enroll`, { jobId }).then(r => r.data),
  updateProgress: (enrollmentId, data) => apiClient.patch(`/courses/enrollments/${enrollmentId}/progress`, data).then(r => r.data)
};

export const interviewsApi = {
  start: (jobId) => apiClient.post('/interviews/start', { jobId }).then(r => r.data),
  answer: (sessionId, answer) => apiClient.post(`/interviews/${sessionId}/answer`, { answer }).then(r => r.data),
  mine: () => apiClient.get('/interviews/me').then(r => r.data),
  get: (id) => apiClient.get(`/interviews/${id}`).then(r => r.data)
};

export const usersApi = {
  updateProfile: (data) => apiClient.patch('/users/me', data).then(r => r.data),
  savedJobs: () => apiClient.get('/users/me/saved-jobs').then(r => r.data),
  saveJob: (jobId) => apiClient.post(`/users/me/saved-jobs/${jobId}`).then(r => r.data),
  unsaveJob: (jobId) => apiClient.delete(`/users/me/saved-jobs/${jobId}`).then(r => r.data)
};

export const companiesApi = {
  list: (params) => apiClient.get('/companies', { params }).then(r => r.data),
  intelligence: (id) => apiClient.get(`/companies/${id}/intelligence`).then(r => r.data),
  create: (data) => apiClient.post('/companies', data).then(r => r.data),
  verify: (id, notes) => apiClient.patch(`/companies/${id}/verify`, { notes }).then(r => r.data)
};

export const recruiterApprovalApi = {
  request: (data) => apiClient.post('/recruiter-approval/request', data).then(r => r.data),
  pending: () => apiClient.get('/recruiter-approval/requests').then(r => r.data),
  review: (id, decision) => apiClient.patch(`/recruiter-approval/requests/${id}`, { decision }).then(r => r.data)
};

export const adminJobsApi = {
  pending: (params) => apiClient.get('/admin/jobs/pending', { params }).then(r => r.data),
  get: (id) => apiClient.get(`/admin/jobs/${id}`).then(r => r.data),
  approve: (id) => apiClient.post(`/admin/jobs/${id}/approve`).then(r => r.data),
  reject: (id, reason) => apiClient.post(`/admin/jobs/${id}/reject`, { reason }).then(r => r.data)
};

export const dashboardApi = {
  recruiter: () => apiClient.get('/dashboard/recruiter').then(r => r.data),
  admin: () => apiClient.get('/dashboard/admin').then(r => r.data)
};

export const recruiterApi = {
  findCandidates: (description, params) =>
    apiClient.post('/recruiter/find-candidates', { description }, { params }).then(r => r.data)
};

export const assessmentsApi = {
  list: (params) => apiClient.get('/assessments', { params }).then(r => r.data),
  submit: (id, data) => apiClient.post(`/assessments/${id}/submit`, data).then(r => r.data),
  pendingSubmissions: () => apiClient.get('/assessments/submissions/pending').then(r => r.data),
  submissions: (params) => apiClient.get('/assessments/submissions', { params }).then(r => r.data),
  mySubmissions: () => apiClient.get('/assessments/submissions/mine').then(r => r.data),
  grade: (submissionId, score, feedback) => apiClient.patch(`/assessments/submissions/${submissionId}/grade`, { score, feedback }).then(r => r.data)
};

export const notificationsApi = {
  list: () => apiClient.get('/notifications').then(r => r.data),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then(r => r.data)
};

export const aiApi = {
  tailorApplication: (data) => apiClient.post('/ai/tailor-application', data).then(r => r.data),
  careerPlanner: () => apiClient.get('/ai/career-planner').then(r => r.data),
  networking: (jobId) => apiClient.get('/ai/networking', { params: { jobId } }).then(r => r.data)
};

export const resumeApi = {
  get: () => apiClient.get('/resume').then(r => r.data),
  upload: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return apiClient.post('/resume', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  remove: () => apiClient.delete('/resume').then(r => r.data),
  updateAutoApply: (data) => apiClient.patch('/resume/auto-apply', data).then(r => r.data),
  runAutoApply: () => apiClient.post('/resume/auto-apply/run').then(r => r.data)
};
