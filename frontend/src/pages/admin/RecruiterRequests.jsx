import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recruiterApprovalApi } from '../../api';
import { Panel, Spinner, EmptyState, Button, Badge } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

export default function RecruiterRequests() {
  const qc = useQueryClient();
  const { push } = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: ['recruiter-requests'], queryFn: recruiterApprovalApi.pending, staleTime: 0, refetchOnMount: 'always' });
  const review = useMutation({
    mutationFn: ({ id, decision }) => recruiterApprovalApi.review(id, decision),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['recruiter-requests'] }); push(`Request ${vars.decision}.`, 'success'); },
    onError: err => push(apiErrorMessage(err, 'Could not review the request.'), 'error')
  });
  const requests = data?.requests || [];
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="font-display text-3xl text-ink">Recruiter requests</h1><p className="text-ink/55 mt-1">Review and approve recruiter access before they can manage hiring.</p></div>
      {error && <p className="text-sm text-alert">{apiErrorMessage(error)}</p>}
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : requests.length === 0 ? <EmptyState title="No pending requests" body="New recruiter applications will appear here." /> : (
        <div className="flex flex-col gap-3">
          {requests.map(r => (
            <Panel key={r._id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><h2 className="font-medium text-ink">{r.user?.name}</h2><Badge>{r.user?.emailVerified ? 'Email verified' : 'Email not verified — approval locked'}</Badge></div>
                  <p className="text-sm text-ink/55 mt-1">{r.user?.email}</p>
                  <p className="text-sm text-ink mt-3">Company: <span className="text-ink/70">{r.companyName}</span></p>
                  {r.companyWebsite && <p className="text-sm text-ink/55">Website: {r.companyWebsite}</p>}
                  {r.phone && <p className="text-sm text-ink/55">Phone: {r.phone}</p>}
                  {r.notes && <p className="text-sm text-ink/55 mt-2">{r.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button disabled={review.isPending || !r.user?.emailVerified} onClick={() => review.mutate({ id: r._id, decision: 'approved' })}>Approve</Button>
                  <Button variant="secondary" disabled={review.isPending} onClick={() => review.mutate({ id: r._id, decision: 'rejected' })}>Reject</Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
