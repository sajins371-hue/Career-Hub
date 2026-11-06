import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { aiApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Button } from '../../components/ui';
import { apiErrorMessage } from '../../lib/apiClient';

export default function CareerPlanner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai', 'career-planner'],
    queryFn: aiApi.careerPlanner,
    retry: false
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Career planner</h1>
        <p className="text-ink/55 mt-1">From where you are now to where you want to be — skill by skill.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <Panel>
          <EmptyState
            title="Add target roles to your profile first"
            body={apiErrorMessage(error, 'We need at least one target role to build a plan.')}
            action={<Link to="/profile"><Button>Go to profile</Button></Link>}
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {data?.plans?.map((plan) => (
            <Panel key={plan.targetRole} className="p-6">
              <h2 className="font-display text-xl text-ink mb-3">{plan.targetRole}</h2>

              {plan.representativeSkillGap ? (
                <div className="mb-4">
                  <p className="text-sm text-ink/55 mb-2">Skills to build toward this role:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.representativeSkillGap.mustLearn.map((s) => <Badge key={s} tone="red">{s}</Badge>)}
                    {plan.representativeSkillGap.alreadyHave.map((s) => <Badge key={s} tone="green">{s}</Badge>)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink/50 mb-4">No open role matching this title yet to compare against.</p>
              )}

              {plan.openJobs?.length > 0 && (
                <div>
                  <p className="text-sm text-ink/55 mb-2">Open roles right now:</p>
                  <ul className="flex flex-col gap-1.5">
                    {plan.openJobs.map((j) => (
                      <li key={j.id}>
                        <Link to={`/jobs/${j.id}`} className="text-sm text-compass hover:underline">{j.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
