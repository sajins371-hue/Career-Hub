import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Button } from '../../components/ui';
import { StatCard, Action } from '../../components/DashboardWidgets';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/apiClient';
import { Briefcase, Clock, UserPlus, Users, PlusCircle, Search, ClipboardList, ArrowRight } from 'lucide-react';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export default function RecruiterHome() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'recruiter'], queryFn: dashboardApi.recruiter,
    enabled: !!user?.emailVerified, staleTime: 0, refetchOnMount: 'always'
  });
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-compass font-semibold mb-1">Recruiter dashboard</p>
          <h1 className="font-display text-2xl md:text-3xl text-ink">{greeting()}, {firstName}</h1>
          <p className="text-ink/50 mt-1 text-sm">{data?.companies?.length ? `Hiring for ${data.companies.join(', ')}` : 'Post roles and review the people who apply.'}</p>
        </div>
        <Link to="/recruiter?tab=post" className="hidden sm:block"><Button>Post a job <PlusCircle size={15} /></Button></Link>
      </div>

      {error && <p className="text-sm text-alert">{apiErrorMessage(error)}</p>}
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Live jobs" value={data.jobs.live} to="/recruiter?tab=applications" icon={Briefcase} />
            <StatCard label="Awaiting admin approval" value={data.jobs.pending} to="/recruiter?tab=applications" icon={Clock} />
            <StatCard label="New applicants" value={data.applications.new} to="/recruiter?tab=applications" icon={UserPlus} />
            <StatCard label="Total applicants" value={data.applications.total} to="/recruiter?tab=applications" icon={Users} />
          </div>

          {data.jobs.rejected > 0 && (
            <Panel className="p-5 border-alert/25">
              <p className="font-semibold text-ink">{data.jobs.rejected} job{data.jobs.rejected === 1 ? ' was' : 's were'} rejected by an admin</p>
              <ul className="mt-2 flex flex-col gap-1">
                {data.rejectedJobs.map((j) => (
                  <li key={j._id} className="text-sm text-ink/70"><span className="text-ink">{j.title}</span>{j.rejectionReason ? ` — ${j.rejectionReason}` : ''}</li>
                ))}
              </ul>
              <p className="text-xs text-ink/45 mt-2">Update the job's details and it goes back for review.</p>
            </Panel>
          )}

          <div className="grid xl:grid-cols-[1fr_330px] gap-6 items-start">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="font-display text-lg text-ink">Recent applicants</h2><p className="text-xs text-ink/45 mt-1">Latest people to apply to your jobs</p></div>
                <Link to="/recruiter?tab=applications" className="text-sm text-compass font-semibold flex items-center gap-1">Review all <ArrowRight size={15} /></Link>
              </div>
              {data.recentApplications.length === 0 ? (
                <Panel><EmptyState title="No applicants yet" body={data.jobs.live ? 'Applicants will show up here once candidates apply.' : 'Post a job — once an admin approves it, candidates can apply.'} /></Panel>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentApplications.map((a) => (
                    <Panel key={a._id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-ink">{a.candidate?.name || 'Candidate'}</p>
                        <p className="text-sm text-ink/55">Applied to {a.job?.title || 'a job'} · {new Date(a.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.matchScore != null && <Badge tone="compass">{Math.round(a.matchScore)}% match</Badge>}
                        <Badge>{a.status.replace('-', ' ')}</Badge>
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </section>

            <Panel className="p-5">
              <h3 className="font-display text-base">Quick Actions</h3>
              <p className="text-xs text-ink/45 mt-1 mb-4">Your hiring tools.</p>
              <div className="flex flex-col gap-2">
                <Action to="/recruiter?tab=post" icon={PlusCircle} title="Post a job" />
                <Action to="/recruiter?tab=applications" icon={ClipboardList} title="Review applicants" />
                <Action to="/recruiter?tab=candidates" icon={Search} title="Find candidates" />
              </div>
              <div className="mt-5 rounded-xl app-gradient-soft p-4">
                <p className="text-xs font-semibold text-compass">HOW IT WORKS</p>
                <p className="text-sm text-ink/65 mt-1">New jobs are reviewed by an admin before candidates can see them.</p>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
