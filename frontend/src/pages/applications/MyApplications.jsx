import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationsApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';

const STATUS_TONE = {
  applied: 'compass', 'in-review': 'compass', interviewing: 'gold',
  offer: 'green', rejected: 'red', withdrawn: 'neutral', saved: 'neutral'
};

export default function MyApplications() {
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['applications', 'mine'], queryFn: applicationsApi.mine });

  const withdrawMutation = useMutation({
    mutationFn: (id) => applicationsApi.withdraw(id),
    onSuccess: () => {
      push('Application withdrawn.', 'info');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  const applications = data?.applications || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Applications</h1>
        <p className="text-ink/55 mt-1">Track every application in one place, whatever source it came from.</p>
      </div>

      {applications.length === 0 ? (
        <Panel><EmptyState title="No applications yet" body="Jobs you apply to will show up here with live status updates." action={<Link to="/jobs"><Button>Browse jobs</Button></Link>} /></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((app) => (
            <Panel key={app._id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to={`/jobs/${app.job?._id}`} className="font-display text-lg text-ink hover:text-compass">
                    {app.job?.title || 'Job no longer listed'}
                  </Link>
                  <p className="text-sm text-ink/55 mt-0.5">{app.job?.company?.name}</p>
                  {typeof app.matchScore === 'number' && (
                    <p className="text-xs text-ink/45 mt-1">{app.matchScore}% match at time of application</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {app.appliedVia === 'auto-apply' && <Badge tone="gold">Auto-applied</Badge>}
                  <Badge tone={STATUS_TONE[app.status] || 'neutral'}>{app.status.replace('-', ' ')}</Badge>
                </div>
              </div>

              {app.timeline?.length > 0 && (
                <ol className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-ink/45">
                  {app.timeline.map((t, i) => (
                    <li key={i}>{t.status.replace('-', ' ')} · {new Date(t.changedAt).toLocaleDateString()}</li>
                  ))}
                </ol>
              )}

              {!['withdrawn', 'rejected', 'offer'].includes(app.status) && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => withdrawMutation.mutate(app._id)} disabled={withdrawMutation.isPending}>
                    Withdraw application
                  </Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
