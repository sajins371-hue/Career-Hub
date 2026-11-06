import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge } from '../../components/ui';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  const notifications = data?.notifications || [];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl text-ink">Notifications</h1>
        <p className="text-ink/55 mt-1">New job matches and application updates land here.</p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Link
              key={n._id}
              to={n.job ? `/jobs/${n.job}` : '#'}
              onClick={() => !n.read && markReadMutation.mutate(n._id)}
              className={`flex items-start justify-between gap-3 border rounded-control px-4 py-3 transition-colors ${
                n.read ? 'border-line bg-panel' : 'border-compass/30 bg-compass/5'
              }`}
            >
              <div>
                <p className="text-sm text-ink">{n.message}</p>
                <p className="text-xs text-ink/45 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read && <Badge tone="compass">New</Badge>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
