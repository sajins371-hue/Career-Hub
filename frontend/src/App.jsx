import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, VerifiedRoute, RoleRoute } from './components/RouteGuards';
import Layout from './components/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/jobs/JobSearch';
import JobDetail from './pages/jobs/JobDetail';
import MyApplications from './pages/applications/MyApplications';
import Courses from './pages/courses/Courses';
import Assessments from './pages/assessments/Assessments';
import InterviewHub from './pages/interviews/InterviewHub';
import InterviewSession from './pages/interviews/InterviewSession';
import Profile from './pages/profile/Profile';
import ResumeMatch from './pages/resume/ResumeMatch';
import CareerPlanner from './pages/career/CareerPlanner';
import Companies from './pages/companies/Companies';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import Notifications from './pages/notifications/Notifications';
import NotFound from './pages/NotFound';
import VerificationRequired from './pages/auth/VerificationRequired';
import RecruiterRequests from './pages/admin/RecruiterRequests';
import JobApprovals from './pages/admin/JobApprovals';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verify-required" element={<VerificationRequired />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route element={<VerifiedRoute />}>
                    <Route element={<RoleRoute roles={['candidate']} />}>
                      <Route path="/jobs" element={<JobSearch />} />
                      <Route path="/jobs/:id" element={<JobDetail />} />
                      <Route path="/applications" element={<MyApplications />} />
                      <Route path="/courses" element={<Courses />} />
                      <Route path="/interviews" element={<InterviewHub />} />
                      <Route path="/interviews/:id" element={<InterviewSession />} />
                      <Route path="/career" element={<CareerPlanner />} />
                      <Route path="/resume" element={<ResumeMatch />} />
                    </Route>
                    <Route element={<RoleRoute roles={['candidate', 'admin']} />}>
                      <Route path="/assessments" element={<Assessments />} />
                    </Route>
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/companies/:id" element={<Companies />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route element={<RoleRoute roles={['recruiter']} />}>
                      <Route path="/recruiter" element={<RecruiterDashboard />} />
                    </Route>
                    <Route element={<RoleRoute roles={['admin']} />}>
                      <Route path="/admin/recruiter-requests" element={<RecruiterRequests />} />
                      <Route path="/admin/job-approvals" element={<JobApprovals />} />
                    </Route>
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
