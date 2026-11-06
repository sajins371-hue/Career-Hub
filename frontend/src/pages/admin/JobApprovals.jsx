import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminJobsApi } from '../../api';
import { Panel, Spinner, EmptyState, Button, Badge, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

const PAGE_SIZE = 20;

function timeAgo(date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const companyOf = (j) => j.company?.name || j.companyNameRaw || 'Company not listed';
const locationOf = (j) => [j.location?.city, j.location?.country].filter(Boolean).join(', ') + (j.location?.remote ? ' (Remote)' : j.location?.hybrid ? ' (Hybrid)' : '') || '—';

// 1 2 3 4 5 … windowed page list
function pageWindow(page, pages) {
  const items = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  if (start > 1) items.push(1, start > 2 ? '…' : null);
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pages) items.push(end < pages - 1 ? '…' : null, pages);
  return items.filter((x) => x !== null);
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</Button>
      {pageWindow(page, pages).map((p, i) => p === '…'
        ? <span key={`gap${i}`} className="px-2 text-ink/40">…</span>
        : <Button key={p} size="sm" variant={p === page ? 'primary' : 'secondary'} onClick={() => onChange(p)}>{p}</Button>)}
      <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
}

function JobReviewModal({ jobId, onClose, onApprove, onReject, busy }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-jobs', 'detail', jobId], queryFn: () => adminJobsApi.get(jobId) });
  const job = data?.job;
  const salary = job?.salary && (job.salary.min || job.salary.max)
    ? `${job.salary.currency || ''} ${job.salary.min ?? ''}${job.salary.max ? ` – ${job.salary.max}` : ''}${job.salary.isEstimated ? ' (auto-estimated)' : ''}`
    : '—';
  const Row = ({ label, children }) => <p className="text-sm"><span className="text-ink/50">{label}: </span><span className="text-ink">{children}</span></p>;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Panel className="p-6 flex flex-col gap-4">
          {isLoading ? <div className="flex justify-center py-10"><Spinner /></div>
            : error ? <p className="text-sm text-alert">{apiErrorMessage(error)}</p>
            : (
              <>
                <div>
                  <h2 className="font-display text-2xl text-ink">{job.title}</h2>
                  <p className="text-ink/55 text-sm mt-1">{companyOf(job)}</p>
                </div>
                {(job.qualitySignals?.isDuplicate || job.qualitySignals?.isSuspicious) && (
                  <div className="flex flex-wrap gap-2">
                    {job.qualitySignals.isDuplicate && <Badge tone="red">Possible duplicate</Badge>}
                    {job.qualitySignals.isSuspicious && <Badge tone="red">Flagged: {(job.qualitySignals.suspiciousReasons || []).join('; ') || 'suspicious'}</Badge>}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-1.5">
                  <Row label="Recruiter">{job.postedBy ? `${job.postedBy.name} (${job.postedBy.email})` : '—'}</Row>
                  <Row label="Posted">{new Date(job.postedAt).toLocaleString()}</Row>
                  <Row label="Employment type">{job.employmentType}</Row>
                  <Row label="Location">{locationOf(job)}</Row>
                  <Row label="Experience">{job.minYearsExperience != null ? `${job.minYearsExperience}+ years` : '—'}</Row>
                  <Row label="Salary">{salary}</Row>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(job.requiredSkills || []).map((s) => <Badge key={s} tone="compass">{s}</Badge>)}
                  {(job.niceToHaveSkills || []).map((s) => <Badge key={s}>{s}</Badge>)}
                </div>
                <div>
                  <p className="text-sm text-ink/50 mb-1">Description</p>
                  {/* Rendered as plain text (React escapes it) */}
                  <p className="text-sm text-ink whitespace-pre-wrap">{job.description}</p>
                </div>
                {rejecting && (
                  <Textarea label="Rejection reason (shown to the recruiter)" rows={3} maxLength={500} value={reason}
                    onChange={(e) => setReason(e.target.value)} placeholder="e.g. Job description contains incomplete information." />
                )}
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="ghost" onClick={onClose}>Close</Button>
                  {rejecting ? (
                    <>
                      <Button variant="secondary" disabled={busy} onClick={() => setRejecting(false)}>Back</Button>
                      <Button variant="danger" disabled={busy} onClick={() => onReject(job._id, reason)}>Confirm reject</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" disabled={busy || job.approvalStatus !== 'pending'} onClick={() => setRejecting(true)}>Reject</Button>
                      <Button disabled={busy || job.approvalStatus !== 'pending'} onClick={() => onApprove(job._id)}>Approve</Button>
                    </>
                  )}
                </div>
              </>
            )}
        </Panel>
      </div>
    </div>
  );
}

export default function JobApprovals() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState(null);
  const [rejectId, setRejectId] = useState(null);   // inline reject from the list
  const [reason, setReason] = useState('');

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin-jobs', 'pending', page],
    queryFn: () => adminJobsApi.pending({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always'
  });
  const jobs = data?.jobs || [];

  const afterReview = (msg) => {
    push(msg, 'success');
    setViewId(null); setRejectId(null); setReason('');
    if (jobs.length === 1 && page > 1) setPage(page - 1); // last item on this page was processed
    qc.invalidateQueries({ queryKey: ['admin-jobs'] });
    qc.invalidateQueries({ queryKey: ['jobs'] }); // approved jobs should show up in candidate search right away
  };
  const onError = (err) => {
    push(apiErrorMessage(err, 'Could not update that job.'), 'error');
    qc.invalidateQueries({ queryKey: ['admin-jobs'] }); // e.g. someone else already reviewed it
  };
  const approve = useMutation({ mutationFn: (id) => adminJobsApi.approve(id), onSuccess: () => afterReview('Job approved and now visible to candidates.'), onError });
  const reject = useMutation({ mutationFn: ({ id, reason: r }) => adminJobsApi.reject(id, r), onSuccess: () => afterReview('Job rejected.'), onError });
  const busy = approve.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Job Approvals</h1>
        <p className="text-ink/55 mt-1">Review recruiter-posted jobs before they become visible to candidates.</p>
        <p className="text-sm text-ink mt-3">Pending jobs: <span className="font-medium">{data?.total ?? '—'}</span></p>
      </div>
      {error && <p className="text-sm text-alert">{apiErrorMessage(error)}</p>}
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : jobs.length === 0 ? (
        <EmptyState title="No jobs waiting for approval" body="New recruiter jobs will appear here for review." />
      ) : (
        <div className={`flex flex-col gap-3 ${isFetching ? 'opacity-70' : ''}`}>
          {jobs.map((j) => (
            <Panel key={j._id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-medium text-ink">{j.title}</h2>
                    {j.qualitySignals?.isDuplicate && <Badge tone="red">Possible duplicate</Badge>}
                    {j.qualitySignals?.isSuspicious && <Badge tone="red">Flagged</Badge>}
                  </div>
                  <p className="text-sm text-ink/70 mt-1">{companyOf(j)}</p>
                  <p className="text-sm text-ink/55">Posted by: {j.postedBy?.name || 'Unknown'} · Posted: {timeAgo(j.postedAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" onClick={() => setViewId(j._id)}>View</Button>
                  <Button disabled={busy} onClick={() => approve.mutate(j._id)}>Approve</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => { setRejectId(rejectId === j._id ? null : j._id); setReason(''); }}>Reject</Button>
                </div>
              </div>
              {rejectId === j._id && (
                <div className="mt-4 flex flex-col gap-3">
                  <Textarea label="Rejection reason (shown to the recruiter)" rows={2} maxLength={500} value={reason}
                    onChange={(e) => setReason(e.target.value)} placeholder="e.g. Job description contains incomplete information." />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
                    <Button variant="danger" disabled={busy} onClick={() => reject.mutate({ id: j._id, reason })}>Confirm reject</Button>
                  </div>
                </div>
              )}
            </Panel>
          ))}
          <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
        </div>
      )}
      {viewId && (
        <JobReviewModal jobId={viewId} busy={busy} onClose={() => setViewId(null)}
          onApprove={(id) => approve.mutate(id)} onReject={(id, r) => reject.mutate({ id, reason: r })} />
      )}
    </div>
  );
}
