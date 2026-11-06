import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import { Panel, Spinner, EmptyState } from '../../components/ui';
import { StatCard, Action } from '../../components/DashboardWidgets';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/apiClient';
import { ClipboardCheck, UserCheck, Award, Users, Briefcase, Building2, FileText, ArrowRight } from 'lucide-react';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const companyOf = (j) => j.company?.name || j.companyNameRaw || 'Company not listed';

export default function AdminHome() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'admin'], queryFn: dashboardApi.admin,
    enabled: !!user?.emailVerified, staleTime: 0, refetchOnMount: 'always'
  });
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-xs text-compass font-semibold mb-1">Admin dashboard</p>
        <h1 className="font-display text-2xl md:text-3xl text-ink">{greeting()}, {firstName}</h1>
        <p className="text-ink/50 mt-1 text-sm">Here is what needs your attention.</p>
      </div>

      {error && <p className="text-sm text-alert">{apiErrorMessage(error)}</p>}
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : data && (
        <>
          <section>
            <h2 className="font-display text-lg text-ink mb-3">Needs review</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Jobs awaiting approval" value={data.queues.pendingJobs} to="/admin/job-approvals" icon={ClipboardCheck} />
              <StatCard label="Recruiter requests" value={data.queues.pendingRecruiters} to="/admin/recruiter-requests" icon={UserCheck} />
              <StatCard label="Assessments to grade" value={data.queues.pendingSubmissions} to="/assessments" icon={Award} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">Platform</h2>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard label="Candidates" value={data.totals.candidates} to="/admin/job-approvals" icon={Users} />
              <StatCard label="Recruiters" value={data.totals.recruiters} to="/admin/recruiter-requests" icon={UserCheck} />
              <StatCard label="Live jobs" value={data.totals.liveJobs} to="/admin/job-approvals" icon={Briefcase} />
              <StatCard label="Companies" value={data.totals.companies} to="/companies" icon={Building2} />
              <StatCard label="Applications" value={data.totals.applications} to="/admin/job-approvals" icon={FileText} />
            </div>
          </section>

          <div className="grid xl:grid-cols-[1fr_330px] gap-6 items-start">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="font-display text-lg text-ink">Latest jobs waiting for approval</h2></div>
                <Link to="/admin/job-approvals" className="text-sm text-compass font-semibold flex items-center gap-1">Open queue <ArrowRight size={15} /></Link>
              </div>
              {data.recentPendingJobs.length === 0 ? (
                <Panel><EmptyState title="Nothing waiting" body="New recruiter jobs will appear here for review." /></Panel>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentPendingJobs.map((j) => (
                    <Link key={j._id} to="/admin/job-approvals">
                      <Panel className="p-4 hover:border-compass/40 transition-colors">
                        <p className="font-medium text-ink">{j.title}</p>
                        <p className="text-sm text-ink/55">{companyOf(j)} · Posted by {j.postedBy?.name || 'Unknown'} · {new Date(j.postedAt).toLocaleDateString()}</p>
                      </Panel>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <Panel className="p-5">
              <h3 className="font-display text-base">Quick Actions</h3>
              <p className="text-xs text-ink/45 mt-1 mb-4">Admin tools.</p>
              <div className="flex flex-col gap-2">
                <Action to="/admin/job-approvals" icon={ClipboardCheck} title="Review jobs" />
                <Action to="/admin/recruiter-requests" icon={UserCheck} title="Review recruiter requests" />
                <Action to="/assessments" icon={Award} title="Grade assessments" />
                <Action to="/companies" icon={Building2} title="Companies" />
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
