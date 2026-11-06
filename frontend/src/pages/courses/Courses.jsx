import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Button, Input } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

export default function Courses() {
  const [tab, setTab] = useState('catalog');
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Learning</h1>
        <p className="text-ink/55 mt-1">Close skill gaps with courses matched to the roles you want.</p>
      </div>

      <div className="flex gap-1 border-b border-line">
        {[['catalog', 'Browse courses'], ['mine', 'My learning']].map(([key, label]) => (
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

      {tab === 'catalog' ? <Catalog /> : <MyLearning />}
    </div>
  );
}

function Catalog() {
  const [skill, setSkill] = useState('');
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['courses', 'catalog', skill], queryFn: () => coursesApi.list({ skill: skill || undefined }) });

  const enrollMutation = useMutation({
    mutationFn: (courseId) => coursesApi.enroll(courseId),
    onSuccess: () => {
      push('Enrolled. Find it under My learning.', 'success');
      queryClient.invalidateQueries({ queryKey: ['courses', 'mine'] });
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not enroll in that course.'), err.response?.status === 409 ? 'info' : 'error')
  });

  return (
    <div className="flex flex-col gap-4">
      <Input placeholder="Filter by skill (e.g. react, aws)" value={skill} onChange={(e) => setSkill(e.target.value)} className="max-w-xs" />
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : data?.courses?.length ? (
        <div className="grid grid-cols-2 gap-3">
          {data.courses.map((c) => (
            <Panel key={c._id} className="p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-lg text-ink">{c.title}</h3>
                {c.isFree ? <Badge tone="green">Free</Badge> : <Badge>{c.currency} {c.price}</Badge>}
              </div>
              <p className="text-sm text-ink/55">{c.provider} {c.durationHours ? `· ${c.durationHours}h` : ''} {c.rating ? `· ${c.rating}★` : ''}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.skillsTaught?.map((s) => <Badge key={s}>{s}</Badge>)}
              </div>
              <div className="mt-2 flex gap-1.5 self-start">
                <Button size="sm" onClick={() => enrollMutation.mutate(c._id)} disabled={enrollMutation.isPending}>
                  Enroll
                </Button>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="secondary" type="button">Open course ↗</Button>
                  </a>
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState title="No courses found" body="Try a different skill, or check back later as the catalog grows." />
      )}
    </div>
  );
}

function MyLearning() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['courses', 'mine'], queryFn: coursesApi.myLearning });

  const progressMutation = useMutation({
    mutationFn: ({ enrollmentId, progressPercent }) => coursesApi.updateProgress(enrollmentId, { progressPercent }),
    onSuccess: (data) => {
      if (data.enrollment.status === 'completed') push('Course completed — skill added to your profile.', 'success');
      queryClient.invalidateQueries({ queryKey: ['courses', 'mine'] });
    },
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  const enrollments = data?.enrollments || [];

  if (enrollments.length === 0) {
    return <EmptyState title="You haven't enrolled in anything yet" body="Browse the catalog and enroll in a course to start tracking progress here." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {enrollments.map((e) => (
        <Panel key={e._id} className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg text-ink">{e.course?.title}</h3>
            <Badge tone={e.status === 'completed' ? 'green' : 'neutral'}>{e.status}</Badge>
          </div>
          <div className="h-1.5 bg-line rounded-full overflow-hidden mb-2">
            <div className="h-full bg-compass" style={{ width: `${e.progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink/50">{e.progressPercent}% complete</p>
            {e.status === 'completed' && e.course?.url && (
              <a href={e.course.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" type="button">Open course ↗</Button>
              </a>
            )}
            {e.status !== 'completed' && (
              <div className="flex gap-1.5">
                {e.course?.url && (
                  <a href={e.course.url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" type="button">Open course ↗</Button>
                  </a>
                )}
                <Button size="sm" variant="secondary" onClick={() => progressMutation.mutate({ enrollmentId: e._id, progressPercent: Math.min(100, e.progressPercent + 25) })}>
                  +25%
                </Button>
                <Button size="sm" onClick={() => progressMutation.mutate({ enrollmentId: e._id, progressPercent: 100 })}>
                  Mark complete
                </Button>
              </div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}