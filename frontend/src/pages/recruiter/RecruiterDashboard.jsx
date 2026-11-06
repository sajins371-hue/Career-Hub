import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, recruiterApi, applicationsApi } from '../../api';
import { Panel, Input, Textarea, Button, Badge, Spinner, EmptyState, ScoreRing } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

const TABS = [
  ['post', 'Post a job'],
  ['candidates', 'Find candidates'],
  ['applications', 'Review applications']
];

export default function RecruiterDashboard() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(['post', 'candidates', 'applications'].includes(initialTab) ? initialTab : 'post');
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Hiring</h1>
        <p className="text-ink/55 mt-1">Post roles, find candidates by ability, and manage your pipeline.</p>
      </div>

      <div className="flex gap-1 border-b border-line">
        {TABS.map(([key, label]) => (
          <button
            key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-compass text-compass font-medium' : 'border-transparent text-ink/55 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'post' && <PostJob />}
      {tab === 'candidates' && <FindCandidates />}
      {tab === 'applications' && <ReviewApplications />}
    </div>
  );
}

function PostJob() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', requiredSkills: '', minYearsExperience: 0,
    country: '', remote: false, employmentType: 'full-time'
  });

  const createMutation = useMutation({
    mutationFn: () => jobsApi.create({
      title: form.title,
      description: form.description,
      requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      minYearsExperience: Number(form.minYearsExperience),
      employmentType: form.employmentType,
      location: { country: form.country, remote: form.remote }
    }),
    onSuccess: (data) => {
      const job = data?.job;
      if (job?.approvalStatus === 'pending') {
        push('Job submitted. It will appear to candidates once an admin approves it.', 'success');
      } else if (job && job.status !== 'active') {
        const reasons = job.qualitySignals?.suspiciousReasons?.join('; ');
        const why = job.qualitySignals?.isDuplicate
          ? 'it looks like a duplicate of an existing posting'
          : reasons || 'it was flagged by the quality checks';
        push(`Job saved but NOT public yet (status: ${job.status}) because ${why}.`, 'error');
      } else {
        push('Job posted and now live. Salary was auto-estimated where you didn\'t provide one.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setForm({ title: '', description: '', requiredSkills: '', minYearsExperience: 0, country: '', remote: false, employmentType: 'full-time' });
    },
    onError: (err) => {
      const details = err?.response?.data?.details;
      const msg = details?.length
        ? details.map((d) => d.message).join(' ')
        : apiErrorMessage(err, 'Could not post that job.');
      push(msg, 'error');
    }
  });

  return (
    <Panel className="p-6 max-w-xl">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="flex flex-col gap-4">
        <Input label="Job title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Description (at least 20 characters)" rows={5} required minLength={20} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input
          label="Required skills" hint="Comma-separated" placeholder="node, mongodb, aws"
          value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Minimum years experience" type="number" min="0" value={form.minYearsExperience} onChange={(e) => setForm({ ...form, minYearsExperience: e.target.value })} />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div className="flex items-center gap-4">
          <select
            value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            className="rounded-control border border-line px-3 py-2.5 text-sm bg-panel"
          >
            {['full-time', 'part-time', 'internship', 'contract', 'temporary'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} />
            Remote
          </label>
        </div>
        <Button type="submit" disabled={createMutation.isPending} className="self-start">
          {createMutation.isPending ? 'Posting…' : 'Post job'}
        </Button>
      </form>
    </Panel>
  );
}

function FindCandidates() {
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { push } = useToast();

  const { data, isFetching, error } = useQuery({
    queryKey: ['recruiter', 'find-candidates', submitted],
    queryFn: () => recruiterApi.findCandidates(submitted),
    enabled: !!submitted
  });

  return (
    <div className="flex flex-col gap-4">
      <Panel className="p-5">
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(description); }} className="flex gap-2">
          <Input
            className="flex-1" placeholder="e.g. Senior React developer, 5+ years, AWS, remote"
            value={description} onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={!description.trim() || isFetching}>{isFetching ? 'Searching…' : 'Search'}</Button>
        </form>
        <p className="text-xs text-ink/45 mt-2">Describe the candidate in plain language — skills and years of experience are picked out automatically.</p>
      </Panel>

      {error && <p className="text-sm text-alert">{apiErrorMessage(error)}</p>}

      {data?.results?.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.results.map((c) => (
            <Panel key={c.candidateId} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-sm text-ink/55">{c.headline}</p>
              </div>
              <ScoreRing score={c.score} size={56} />
            </Panel>
          ))}
        </div>
      )}

      {data && data.results.length === 0 && <EmptyState title="No matching candidates found" body="Try broadening the description." />}
    </div>
  );
}

function ReviewApplications() {
  const [selectedJobId, setSelectedJobId] = useState('');
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', 'mine'],
    queryFn: jobsApi.mine
  });

  const { data: appsData, isLoading: loadingApps } = useQuery({
    queryKey: ['applications', 'forJob', selectedJobId],
    queryFn: () => applicationsApi.forJob(selectedJobId),
    enabled: !!selectedJobId
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => applicationsApi.updateStatus(id, { status }),
    onSuccess: () => {
      push('Application updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['applications', 'forJob', selectedJobId] });
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not update that application.'), 'error')
  });

  const jobs = jobsData?.jobs || [];
  const selectedJob = jobs.find((j) => j._id === selectedJobId);
  const applications = appsData?.applications || [];
  const STATUS_OPTIONS = ['applied', 'in-review', 'interviewing', 'offer', 'rejected'];

  if (loadingJobs) return <div className="flex justify-center py-10"><Spinner /></div>;

  if (jobs.length === 0) {
    return <EmptyState title="You haven't posted any jobs yet" body="Post a role first — applicants will show up here once they apply." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}
        className="rounded-control border border-line px-3 py-2.5 text-sm bg-panel max-w-sm"
      >
        <option value="">Select a posting…</option>
        {jobs.map((j) => (
          <option key={j._id} value={j._id}>
            {j.title}{j.approvalStatus === 'pending' ? ' (awaiting admin approval)' : j.approvalStatus === 'rejected' ? ' (rejected)' : ''}
          </option>
        ))}
      </select>
      {selectedJob?.approvalStatus === 'pending' && <p className="text-sm text-ink/60">This job is awaiting admin approval and is not visible to candidates yet.</p>}
      {selectedJob?.approvalStatus === 'rejected' && (
        <p className="text-sm text-alert">Rejected by admin{selectedJob.rejectionReason ? `: ${selectedJob.rejectionReason}` : '.'}</p>
      )}

      {!selectedJobId ? (
        <EmptyState title="Pick a posting" body="Choose one of your jobs above to see who's applied." />
      ) : loadingApps ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : applications.length === 0 ? (
        <EmptyState title="No applicants yet" body="Check back once candidates start applying to this role." />
      ) : (
        <div className="flex flex-col gap-2">
          {applications.map((app) => (
            <Panel key={app._id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{app.candidate?.name}</p>
                <p className="text-sm text-ink/55">{app.candidate?.headline}</p>
                {typeof app.matchScore === 'number' && (
                  <p className="text-xs text-ink/45 mt-0.5">{app.matchScore}% match</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge>{app.status.replace('-', ' ')}</Badge>
                <select
                  value={app.status}
                  onChange={(e) => statusMutation.mutate({ id: app._id, status: e.target.value })}
                  disabled={statusMutation.isPending}
                  className="rounded-control border border-line px-2 py-1.5 text-xs bg-panel"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
                </select>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
