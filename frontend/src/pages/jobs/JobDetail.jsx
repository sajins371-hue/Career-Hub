import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Briefcase, Bookmark, Mic } from 'lucide-react';
import { jobsApi, applicationsApi, coursesApi, usersApi } from '../../api';
import { Button, Panel, Spinner, Badge, ScoreRing, Divider } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

export default function JobDetail() {
  const { id } = useParams();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [showLearningPath, setShowLearningPath] = useState(false);

  const { data: jobData, isLoading } = useQuery({ queryKey: ['jobs', id], queryFn: () => jobsApi.get(id) });
  const { data: matchData } = useQuery({ queryKey: ['jobs', id, 'match'], queryFn: () => jobsApi.match(id) });
  const { data: skillGapData } = useQuery({ queryKey: ['jobs', id, 'skill-gap'], queryFn: () => jobsApi.skillGap(id) });
  const { data: learningPathData, isLoading: loadingPath } = useQuery({
    queryKey: ['courses', 'learning-path', id],
    queryFn: () => coursesApi.learningPathForJob(id),
    enabled: showLearningPath
  });

  const applyMutation = useMutation({
    mutationFn: () => applicationsApi.apply(id),
    onSuccess: () => {
      push('Application submitted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not submit your application.'), 'error')
  });

  const saveMutation = useMutation({
    mutationFn: () => usersApi.saveJob(id),
    onSuccess: () => push('Saved to your list.', 'success'),
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  const job = jobData?.job;
  if (!job) return <p className="text-ink/55">This job couldn't be found.</p>;

  const salaryText = job.salary?.min
    ? `${job.salary.currency || 'USD'} ${job.salary.min.toLocaleString()}–${job.salary.max.toLocaleString()}${job.salary.isEstimated ? ' (estimated)' : ''}`
    : 'Not listed';

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {job.employmentType === 'internship' && <Badge tone="gold">Internship</Badge>}
            {job.company?.isVerified && <Badge tone="green">Verified employer</Badge>}
          </div>
          <h1 className="font-display text-3xl text-ink">{job.title}</h1>
          <p className="text-ink/60 mt-1">{job.company?.name || job.companyNameRaw}</p>
          <div className="flex gap-4 mt-3 text-sm text-ink/55">
            <span className="flex items-center gap-1"><MapPin size={14} /> {job.location?.remote ? 'Remote' : job.location?.country}</span>
            <span className="flex items-center gap-1"><Briefcase size={14} /> {salaryText}</span>
          </div>
        </div>

        <Divider />

        <div>
          <h2 className="font-display text-lg text-ink mb-2">About this role</h2>
          <p className="text-sm text-ink/70 whitespace-pre-line leading-relaxed">{job.description}</p>
        </div>

        {job.requiredSkills?.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-ink mb-2">Required skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map((s) => <Badge key={s}>{s}</Badge>)}
            </div>
          </div>
        )}

        {skillGapData?.mustLearn?.length > 0 && (
          <Panel className="p-5">
            <h2 className="font-display text-lg text-ink mb-1">Skills to close the gap</h2>
            <p className="text-sm text-ink/55 mb-3">You're missing {skillGapData.mustLearn.length} required skill{skillGapData.mustLearn.length !== 1 ? 's' : ''} for this role.</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {skillGapData.mustLearn.map((s) => <Badge key={s} tone="red">{s}</Badge>)}
            </div>
            {!showLearningPath ? (
              <Button variant="secondary" size="sm" onClick={() => setShowLearningPath(true)}>Show me a learning path</Button>
            ) : loadingPath ? (
              <Spinner size={18} />
            ) : learningPathData?.path?.length ? (
              <ul className="flex flex-col gap-2">
                {learningPathData.path.map(({ course, coversSkills }) => (
                  <li key={course._id} className="flex items-center justify-between border border-line rounded-control px-3 py-2 text-sm">
                    <div>
                      <p className="text-ink font-medium">{course.title}</p>
                      <p className="text-ink/50 text-xs">Covers: {coversSkills.join(', ')}</p>
                    </div>
                    <Link to="/courses" className="text-compass text-xs hover:underline shrink-0 ml-3">View course</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/50">No courses in the catalog cover these skills yet.</p>
            )}
          </Panel>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Panel className="p-5 flex flex-col items-center text-center">
          {matchData ? (
            <>
              <ScoreRing score={matchData.score} label="Match score" />
              <p className="text-xs text-ink/50 mt-2">
                Based on your skills, experience, and career goals.
              </p>
            </>
          ) : <Spinner />}
        </Panel>

        <div className="flex flex-col gap-2">
          <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || applyMutation.isSuccess}>
            {applyMutation.isSuccess ? 'Applied' : applyMutation.isPending ? 'Submitting…' : 'Apply now'}
          </Button>
          <Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Bookmark size={16} /> Save for later
          </Button>
          <Link to="/interviews" state={{ jobId: job._id, jobTitle: job.title }}>
            <Button variant="ghost" className="w-full"><Mic size={16} /> Practice for this role</Button>
          </Link>
        </div>

        {matchData?.breakdown?.requiredSkills?.matched?.length > 0 && (
          <Panel className="p-4">
            <p className="text-xs font-medium text-ink/50 mb-2">Why you match</p>
            <div className="flex flex-wrap gap-1.5">
              {matchData.breakdown.requiredSkills.matched.map((s) => <Badge key={s} tone="green">{s}</Badge>)}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
