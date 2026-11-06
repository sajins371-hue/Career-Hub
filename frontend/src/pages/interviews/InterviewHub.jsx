import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { interviewsApi, jobsApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Button, Input } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

export default function InterviewHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const [jobQuery, setJobQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(location.state?.jobId || '');

  const { data: jobResults } = useQuery({
    queryKey: ['jobs', 'search-for-interview', jobQuery],
    queryFn: () => jobsApi.search({ q: jobQuery, limit: 5 }),
    enabled: jobQuery.length > 1
  });

  const { data: history, isLoading } = useQuery({ queryKey: ['interviews', 'mine'], queryFn: interviewsApi.mine });

  const startMutation = useMutation({
    mutationFn: () => interviewsApi.start(selectedJobId),
    onSuccess: (data) => navigate(`/interviews/${data.sessionId}`, { state: { currentQuestion: data.currentQuestion, totalQuestions: data.totalQuestions } }),
    onError: (err) => push(apiErrorMessage(err, 'Could not start a practice session for that role.'), 'error')
  });

  const sessions = history?.sessions || [];
  const completed = sessions.filter((s) => s.status === 'completed').slice().reverse();
  const chartData = completed.map((s, i) => ({ attempt: i + 1, score: s.overallScore }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Interview practice</h1>
        <p className="text-ink/55 mt-1">Practice with questions built from a real job's required skills, and get feedback on every answer.</p>
      </div>

      <Panel className="p-5">
        <h2 className="font-display text-lg text-ink mb-3">Start a new session</h2>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Search for a job to practice for…"
              value={location.state?.jobTitle && !jobQuery ? location.state.jobTitle : jobQuery}
              onChange={(e) => { setJobQuery(e.target.value); setSelectedJobId(''); }}
            />
            {jobQuery.length > 1 && jobResults?.jobs?.length > 0 && !selectedJobId && (
              <ul className="absolute z-10 top-full left-0 right-0 bg-panel border border-line rounded-control mt-1 shadow-sm max-h-56 overflow-auto">
                {jobResults.jobs.map((j) => (
                  <li key={j._id}>
                    <button
                      type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-ink/5"
                      onClick={() => { setSelectedJobId(j._id); setJobQuery(j.title); }}
                    >
                      {j.title} <span className="text-ink/45">— {j.company?.name || j.companyNameRaw}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={() => startMutation.mutate()} disabled={!selectedJobId || startMutation.isPending}>
            {startMutation.isPending ? 'Starting…' : 'Start practice'}
          </Button>
        </div>
      </Panel>

      {chartData.length > 1 && (
        <Panel className="p-5">
          <h2 className="font-display text-lg text-ink mb-4">Your score trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#E6E9F5" vertical={false} />
              <XAxis dataKey="attempt" tick={{ fontSize: 12, fill: '#0F172AAA' }} label={{ value: 'Attempt', position: 'insideBottom', offset: -3, fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#0F172AAA' }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      )}

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Practice history</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : sessions.length === 0 ? (
          <EmptyState title="No practice sessions yet" body="Start one above — questions are generated from the job's required skills." />
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <button
                key={s._id} onClick={() => navigate(`/interviews/${s._id}`)}
                className="flex items-center justify-between border border-line rounded-control px-4 py-3 text-left hover:border-compass transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{s.job?.title || 'Job removed'}</p>
                  <p className="text-xs text-ink/50">{new Date(s.startedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {typeof s.overallScore === 'number' && <span className="font-display text-lg text-ink">{s.overallScore}</span>}
                  <Badge tone={s.status === 'completed' ? 'green' : 'neutral'}>{s.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
