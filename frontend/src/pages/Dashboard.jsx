import { Panel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config/brand';
import ResendVerification from '../components/ResendVerification';
import CandidateDashboard from './dashboards/CandidateDashboard';
import RecruiterHome from './dashboards/RecruiterHome';
import AdminHome from './dashboards/AdminHome';

// "/" shows a different dashboard per role. Each one only offers that role's features.
export default function Dashboard() {
  const { user } = useAuth();
  const verified = !!user?.emailVerified;
  const Home = user?.role === 'admin' ? AdminHome : user?.role === 'recruiter' ? RecruiterHome : CandidateDashboard;

  return (
    <div className="flex flex-col gap-7">
      {!verified && (
        <Panel className="p-5 border-compass/25 bg-compass/5">
          <p className="font-semibold text-ink">Verify your email to unlock {APP_NAME}</p>
          <p className="text-sm text-ink/60 mt-1 mb-3">We sent a link to {user?.email}. Check your inbox and spam folder.</p>
          <ResendVerification />
        </Panel>
      )}
      <Home />
    </div>
  );
}
