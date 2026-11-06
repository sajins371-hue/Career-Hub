import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { interviewsApi } from '../../api';
import { Panel, Textarea, Button, Badge, ScoreRing, Divider, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

export default function InterviewSession() {
  const { id } = useParams();
  const location = useLocation();
  const { push } = useToast();

  // If we arrived straight from "Start practice", we already have the first question in
  // route state and don't need a fetch. Otherwise (resuming from history), load the session.
  const [liveQuestion, setLiveQuestion] = useState(location.state?.currentQuestion || null);
  const [progress, setProgress] = useState(location.state?.totalQuestions ? { answered: 0, total: location.state.totalQuestions } : null);
  const [answer, setAnswer] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [result, setResult] = useState(null);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['interviews', id],
    queryFn: () => interviewsApi.get(id),
    enabled: !liveQuestion && !result
  });

  const session = sessionData?.session;

  // Resuming an in-progress session from history: derive the next unanswered question once
  // session data loads. This hook always runs (never after a conditional return) — only its
  // *body* is conditional, which keeps it compliant with the Rules of Hooks.
  useEffect(() => {
    if (session && session.status === 'in-progress' && !liveQuestion && !result) {
      const nextIdx = session.answers.length;
      const nextQ = session.questions[nextIdx];
      if (nextQ) {
        setLiveQuestion({ questionId: nextQ.questionId, text: nextQ.text, type: nextQ.type });
        setProgress({ answered: nextIdx, total: session.questions.length });
      }
    }
  }, [session, liveQuestion, result]);

  const answerMutation = useMutation({
    mutationFn: (text) => interviewsApi.answer(id, text),
    onSuccess: (data) => {
      setLastFeedback(data.feedback);
      setAnswer('');
      if (data.completed) {
        setResult({ overallScore: data.overallScore, summary: data.summary });
        setLiveQuestion(null);
      } else {
        setLiveQuestion(data.nextQuestion);
        setProgress(data.progress);
      }
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not submit that answer.'), 'error')
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    answerMutation.mutate(answer);
  }

  // All hooks above this line run on every render, unconditionally. Everything below is safe
  // to return early from.
  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (session && session.status === 'completed' && !result && !liveQuestion) {
    return <CompletedView session={session} />;
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-4 py-10">
        <ScoreRing score={result.overallScore} size={120} label="Overall score" />
        <h1 className="font-display text-2xl text-ink mt-2">Session complete</h1>
        {result.summary?.strengths?.length > 0 && (
          <div className="w-full text-left">
            <p className="text-sm font-medium text-ink mb-2">What went well</p>
            <ul className="flex flex-col gap-1.5">
              {result.summary.strengths.map((s, i) => <FeedbackLine key={i} icon="good" text={s} />)}
            </ul>
          </div>
        )}
        {result.summary?.improvements?.length > 0 && (
          <div className="w-full text-left">
            <p className="text-sm font-medium text-ink mb-2 mt-2">Focus on next time</p>
            <ul className="flex flex-col gap-1.5">
              {result.summary.improvements.map((s, i) => <FeedbackLine key={i} icon="improve" text={s} />)}
            </ul>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Link to="/interviews"><Button variant="secondary">Back to practice hub</Button></Link>
        </div>
      </div>
    );
  }

  if (!liveQuestion) return <p className="text-ink/55">This session has no more questions.</p>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {progress && (
        <div>
          <div className="h-1.5 bg-line rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-compass transition-all" style={{ width: `${(progress.answered / progress.total) * 100}%` }} />
          </div>
          <p className="text-xs text-ink/50">Question {progress.answered + 1} of {progress.total}</p>
        </div>
      )}

      {lastFeedback && (
        <Panel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display text-2xl text-ink">{lastFeedback.score}</span>
            <span className="text-xs text-ink/45">/ 100 on your last answer</span>
          </div>
          <div className="flex flex-col gap-1">
            {lastFeedback.strengths?.map((s, i) => <FeedbackLine key={`s${i}`} icon="good" text={s} />)}
            {lastFeedback.improvements?.map((s, i) => <FeedbackLine key={`i${i}`} icon="improve" text={s} />)}
          </div>
        </Panel>
      )}

      <Panel className="p-6">
        <Badge tone={liveQuestion.type === 'technical' ? 'compass' : 'gold'}>{liveQuestion.type}</Badge>
        <h2 className="font-display text-xl text-ink mt-3">{liveQuestion.text}</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Textarea
            rows={6} placeholder="Answer as you would out loud — specific examples score better than general statements."
            value={answer} onChange={(e) => setAnswer(e.target.value)} required
          />
          <Button type="submit" disabled={answerMutation.isPending} className="self-end">
            {answerMutation.isPending ? 'Scoring…' : 'Submit answer'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function FeedbackLine({ icon, text }) {
  const Icon = icon === 'good' ? CheckCircle2 : AlertCircle;
  const color = icon === 'good' ? 'text-signal' : 'text-milestone-dark';
  return (
    <li className="flex items-start gap-2 text-sm text-ink/70">
      <Icon size={15} className={`${color} mt-0.5 shrink-0`} />
      {text}
    </li>
  );
}

function CompletedView({ session }) {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ScoreRing score={session.overallScore || 0} label="Overall score" />
        <div>
          <h1 className="font-display text-2xl text-ink">{session.job?.title}</h1>
          <p className="text-sm text-ink/50">Completed {new Date(session.completedAt).toLocaleDateString()}</p>
        </div>
      </div>
      <Divider />
      <div className="flex flex-col gap-4">
        {session.questions.map((q, i) => {
          const a = session.answers[i];
          return (
            <Panel key={q.questionId} className="p-5">
              <Badge tone={q.type === 'technical' ? 'compass' : 'gold'}>{q.type}</Badge>
              <p className="font-medium text-ink mt-2">{q.text}</p>
              {a && (
                <>
                  <p className="text-sm text-ink/60 mt-2 italic">"{a.text}"</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-display text-lg text-ink">{a.feedback.score}</span>
                    <span className="text-xs text-ink/45">/ 100</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {a.feedback.strengths?.map((s, j) => <FeedbackLine key={`s${j}`} icon="good" text={s} />)}
                    {a.feedback.improvements?.map((s, j) => <FeedbackLine key={`i${j}`} icon="improve" text={s} />)}
                  </div>
                </>
              )}
            </Panel>
          );
        })}
      </div>
      <Link to="/interviews"><Button variant="secondary">Back to practice hub</Button></Link>
    </div>
  );
}
