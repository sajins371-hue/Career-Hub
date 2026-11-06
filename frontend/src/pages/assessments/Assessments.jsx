import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Button, Input, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/apiClient';

export default function Assessments() {
  const { user } = useAuth();
  const [tab, setTab] = useState('catalog');
  const tabs = [['catalog', 'Assessments']];
  if (user?.role === 'admin') tabs.push(['grading', 'Review queue'], ['history', 'Reviewed']);
  else tabs.push(['mine', 'My submissions']);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Skill assessments</h1>
        <p className="text-ink/55 mt-1">Prove a skill with a real submission — a human reviewer verifies it before it's added to your profile.</p>
      </div>

      <div className="flex gap-1 border-b border-line">
        {tabs.map(([key, label]) => (
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

      {tab === 'catalog' && <Catalog />}
      {tab === 'grading' && user?.role === 'admin' && <GradingQueue />}
      {tab === 'history' && user?.role === 'admin' && <ReviewedHistory />}
      {tab === 'mine' && user?.role !== 'admin' && <MySubmissions />}
    </div>
  );
}

function Catalog() {
  const { push } = useToast();
  const [skill, setSkill] = useState('');
  const [urls, setUrls] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', 'catalog', skill],
    queryFn: () => assessmentsApi.list({ skill: skill || undefined })
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, submissionUrl }) => assessmentsApi.submit(id, { submissionUrl }),
    onSuccess: (_data, variables) => {
      push('Submitted — a reviewer will grade it soon.', 'success');
      setUrls((prev) => ({ ...prev, [variables.id]: '' }));
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not submit that.'), 'error')
  });

  const assessments = data?.assessments || [];

  return (
    <div className="flex flex-col gap-4">
      <Input placeholder="Filter by skill (e.g. react, sql)" value={skill} onChange={(e) => setSkill(e.target.value)} className="max-w-xs" />

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : assessments.length ? (
        <div className="flex flex-col gap-3">
          {assessments.map((a) => (
            <Panel key={a._id} className="p-5">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-display text-lg text-ink">{a.title || a.skill}</h3>
                {a.type && <Badge>{a.type}</Badge>}
              </div>
              {a.description && <p className="text-sm text-ink/55 mb-3">{a.description}</p>}
              <p className="text-xs text-ink/45 mb-3">Passing score: {a.passingScore}</p>
              <form
                onSubmit={(e) => { e.preventDefault(); submitMutation.mutate({ id: a._id, submissionUrl: urls[a._id] || '' }); }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Link to your submission (repo, doc, deployed app…)"
                  value={urls[a._id] || ''}
                  onChange={(e) => setUrls({ ...urls, [a._id]: e.target.value })}
                  className="flex-1" required
                />
                <Button type="submit" size="sm" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Submitting…' : 'Submit for review'}
                </Button>
              </form>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState title="No assessments found" body="Try a different skill, or check back later." />
      )}
    </div>
  );
}

// Only plain web links are rendered as clickable (guards against javascript: URLs).
const isWebUrl = (u) => /^https?:\/\//i.test(u || '');
const SafeLink = ({ url }) => isWebUrl(url)
  ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-compass hover:underline break-all">{url}</a>
  : <span className="text-sm text-ink/70 break-all">{url}</span>;

function GradingQueue() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({}); // { [id]: { score, feedback } }
  const setField = (id, k, v) => setForm((f) => ({ ...f, [id]: { ...f[id], [k]: v } }));

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', 'pending', page],
    queryFn: () => assessmentsApi.submissions({ status: 'pending', page, limit: 20 }),
    staleTime: 0, refetchOnMount: 'always'
  });

  const gradeMutation = useMutation({
    mutationFn: ({ id, score, feedback }) => assessmentsApi.grade(id, score, feedback),
    onSuccess: (res) => {
      push(res.submission?.passed ? 'Graded — passed, skill verified.' : 'Graded — did not pass.', 'success');
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
    onError: (err) => {
      push(apiErrorMessage(err, 'Could not grade that submission.'), 'error');
      queryClient.invalidateQueries({ queryKey: ['assessments'] }); // e.g. already graded elsewhere
    }
  });

  const submissions = data?.submissions || [];
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (submissions.length === 0) return <EmptyState title="Nothing to review" body="Every submission has been reviewed." />;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink">Waiting for review: <span className="font-medium">{data?.total ?? submissions.length}</span></p>
      {submissions.map((s) => {
        const f = form[s._id] || {};
        const score = f.score === undefined || f.score === '' ? null : Number(f.score);
        const pass = s.assessment?.passingScore;
        return (
          <Panel key={s._id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-ink">{s.candidate?.name} <span className="text-ink/45 font-normal">— {s.assessment?.title || s.assessment?.skill}</span></p>
                <p className="text-xs text-ink/45">{s.candidate?.email} · submitted {new Date(s.submittedAt).toLocaleString()}</p>
                <div className="mt-1"><SafeLink url={s.submissionUrl} /></div>
              </div>
              <p className="text-xs text-ink/45 shrink-0">Passing: {pass}</p>
            </div>
            {s.assessment?.description && <p className="text-sm text-ink/55">{s.assessment.description}</p>}
            {s.assessment?.rubric?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.assessment.rubric.map((r, i) => <Badge key={i}>{r.criterion}{r.weight ? ` · ${r.weight}%` : ''}</Badge>)}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); gradeMutation.mutate({ id: s._id, score: Number(f.score), feedback: f.feedback || undefined }); }}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-3 items-end flex-wrap">
                <Input label="Score (0–100)" type="number" min="0" max="100" required value={f.score ?? ''}
                  onChange={(e) => setField(s._id, 'score', e.target.value)} className="max-w-[140px]" />
                {score !== null && !Number.isNaN(score) && pass != null && (
                  <Badge tone={score >= pass ? 'compass' : 'red'}>{score >= pass ? 'Will pass' : 'Will not pass'}</Badge>
                )}
              </div>
              <Textarea label="Feedback for the candidate (optional)" rows={2} maxLength={1000} value={f.feedback ?? ''}
                onChange={(e) => setField(s._id, 'feedback', e.target.value)} placeholder="What worked, what to improve…" />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={gradeMutation.isPending}>{gradeMutation.isPending ? 'Saving…' : 'Submit grade'}</Button>
              </div>
            </form>
          </Panel>
        );
      })}
      {data?.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-sm text-ink/55">Page {page} of {data.pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function ReviewedHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['assessments', 'graded', page],
    queryFn: () => assessmentsApi.submissions({ status: 'graded', page, limit: 20 })
  });
  const submissions = data?.submissions || [];
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (submissions.length === 0) return <EmptyState title="No reviewed submissions yet" body="Graded submissions will be listed here." />;
  return (
    <div className="flex flex-col gap-3">
      {submissions.map((s) => (
        <Panel key={s._id} className="p-5 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium text-ink">{s.candidate?.name} <span className="text-ink/45 font-normal">— {s.assessment?.title || s.assessment?.skill}</span></p>
            <Badge tone={s.passed ? 'compass' : 'red'}>{s.passed ? 'Passed' : 'Failed'} · {s.score}</Badge>
          </div>
          <SafeLink url={s.submissionUrl} />
          {s.feedback && <p className="text-sm text-ink/70">Feedback: {s.feedback}</p>}
          <p className="text-xs text-ink/45">Graded {s.gradedAt ? new Date(s.gradedAt).toLocaleString() : ''}{s.gradedBy?.name ? ` by ${s.gradedBy.name}` : ''}</p>
        </Panel>
      ))}
      {data?.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-sm text-ink/55">Page {page} of {data.pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function MySubmissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['assessments', 'mine'], queryFn: assessmentsApi.mySubmissions, staleTime: 0, refetchOnMount: 'always'
  });
  const submissions = data?.submissions || [];
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (submissions.length === 0) return <EmptyState title="No submissions yet" body="Submit work from the Assessments tab and track the review here." />;
  return (
    <div className="flex flex-col gap-3">
      {submissions.map((s) => (
        <Panel key={s._id} className="p-5 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium text-ink">{s.assessment?.title || s.assessment?.skill}</p>
            {s.status === 'pending' ? <Badge>Pending review</Badge>
              : <Badge tone={s.passed ? 'compass' : 'red'}>{s.passed ? 'Passed' : 'Not passed'} · {s.score}/100</Badge>}
          </div>
          <SafeLink url={s.submissionUrl} />
          {s.feedback && <p className="text-sm text-ink/70">Reviewer feedback: {s.feedback}</p>}
          <p className="text-xs text-ink/45">Submitted {new Date(s.submittedAt).toLocaleString()}</p>
        </Panel>
      ))}
    </div>
  );
}
