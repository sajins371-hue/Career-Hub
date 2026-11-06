import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { jobsApi, applicationsApi, interviewsApi } from '../../api';
import JobCard from '../../components/JobCard';
import { Panel, Spinner, EmptyState, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME } from '../../config/brand';
import { StatCard, Action } from '../../components/DashboardWidgets';
import { FileText, Mic, Sparkles, Briefcase, ArrowRight, BookOpen, Target, ChevronRight } from 'lucide-react';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const verified = !!user?.emailVerified;
  const { data: recommended, isLoading: loadingJobs } = useQuery({ queryKey: ['jobs','recommended'], queryFn: () => jobsApi.recommended({ limit: 4 }), enabled: verified });
  const { data: applications } = useQuery({ queryKey: ['applications','mine'], queryFn: applicationsApi.mine, enabled: verified });
  const { data: interviews } = useQuery({ queryKey: ['interviews','mine'], queryFn: interviewsApi.mine, enabled: verified });
  const firstName = user?.name?.split(' ')[0] || 'there';
  const activeApplications = applications?.applications?.filter(a => !['rejected','withdrawn'].includes(a.status)) || [];

  return <div className="flex flex-col gap-7">
    <section>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div><p className="text-xs text-compass font-semibold mb-1">Student dashboard</p><h1 className="font-display text-2xl md:text-3xl text-ink">Good Morning, {firstName} 👋</h1><p className="text-ink/50 mt-1 text-sm">Keep going! Every step brings you closer to your dream job.</p></div>
        <Link to="/profile" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-compass hover:underline">Complete profile <ArrowRight size={15}/></Link>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active applications" value={activeApplications.length} to="/applications" icon={Briefcase} />
        <StatCard label="Interviews practiced" value={interviews?.sessions?.length || 0} to="/interviews" icon={Mic} />
        <StatCard label="Strong matches" value={recommended?.results?.length || 0} to="/jobs" icon={Sparkles} />
        <StatCard label="Applications sent" value={applications?.applications?.length || 0} to="/applications" icon={FileText} />
      </div>
    </section>

    <section className="rounded-card p-7 md:p-8 relative overflow-hidden bg-ink">
      <div className="relative z-10 max-w-2xl"><span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">YOUR CAREER JOURNEY</span><h2 className="font-display text-2xl md:text-3xl mt-3 text-white">Starts Here</h2><p className="text-white/85 text-sm mt-2 max-w-lg">Learn new skills, practice with AI, and get hired with {APP_NAME}.</p><div className="flex flex-wrap gap-3 mt-6"><Link to="/courses"><Button className="!bg-white !text-compass hover:!bg-white/90 shadow-none">Explore Learning <ArrowRight size={15}/></Button></Link></div></div>
    </section>

    <div className="grid xl:grid-cols-[1fr_330px] gap-6 items-start">
      <section><div className="flex items-center justify-between mb-4"><div><h2 className="font-display text-lg text-ink">Recommended for you</h2><p className="text-xs text-ink/45 mt-1">Roles matched to your skills and goals</p></div><Link to="/jobs" className="text-sm text-compass font-semibold flex items-center gap-1">See all jobs <ChevronRight size={15}/></Link></div>
        {loadingJobs ? <div className="flex justify-center py-10"><Spinner/></div> : recommended?.results?.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{recommended.results.map(({job,score}) => <JobCard key={job._id} job={{...job,matchScore:score}}/>)}</div> : <Panel><EmptyState title="No strong matches yet" body="Add skills and career goals to your profile so we can find roles that fit." action={<Link to="/profile"><Button variant="secondary">Complete your profile</Button></Link>}/></Panel>}
      </section>
      <QuickActions />
    </div>
  </div>;
}

function QuickActions(){ return <Panel className="p-5"><h3 className="font-display text-base">Quick Actions</h3><p className="text-xs text-ink/45 mt-1 mb-4">Keep your momentum going.</p><div className="flex flex-col gap-2"><Action to="/courses" icon={BookOpen} title="Continue learning"/><Action to="/assessments" icon={Target} title="Take an assessment"/><Action to="/interviews" icon={Mic} title="Practice with AI"/></div><div className="mt-5 rounded-xl app-gradient-soft p-4"><p className="text-xs font-semibold text-compass">CAREER TIP</p><p className="text-sm text-ink/65 mt-1">Complete your profile to improve job matching.</p></div></Panel> }
